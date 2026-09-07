# Deployment notes

Both config files in this repo are validated against a schema by the tool that
reads them, and neither tolerates a `"//"` key. JSON has no comments, so the
explanations that used to live inside them live here instead.

---

## Maintenance mode

**It is currently ON.** Every route serves `public/maintenance.html`.

### Why it is done at the hosting layer

`vercel.json` rewrites all traffic to a static page, so the React bundle is
never requested. No Firebase SDK download, no auth listener, no Firestore
connection. Nobody can sign in because the code that signs people in is never
served.

An earlier version gated this inside `main.jsx`. That was strictly weaker: the
browser still downloaded and booted the whole application before deciding to
render something else.

The page itself is one file with no scripts, no webfont and no external
requests, at about 4.5KB. The most likely reason it is up is that something in
the project is mid-repair, so it must not depend on anything in the project to
render.

### Going live again

Replace the `rewrites` array in `vercel.json` with just the SPA fallback:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Then redeploy. `public/_redirects` carries the same rules for Netlify and
should be reverted to `/*  /index.html  200` at the same time.

### What still works while it is on

- `/privacy` and `/terms` are matched *before* the catch-all. They are static,
  they touch no data, and a privacy policy that disappears during maintenance
  is the one page you cannot take down.
- `/assets/*` and `/seed/*` are untouched. Vercel serves real files from the
  filesystem before it considers any rewrite, so static assets need no
  exemption in the rewrite list.

Rewrites match in order and the first one wins, which is why the catch-all is
last.

### What this is not

A security control. It stops ordinary visitors seeing a half-finished app. It
does not protect data — `firestore.rules` does that, and it is unaffected by
any of this.

---

## Firestore indexes

`firestore.indexes.json` declares six collection-group indexes and one TTL
field override. Firestore creates single-field indexes automatically but not
these: a `collectionGroup` query needs its scope declared explicitly.

Deploy them with:

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes
./verify-rules.sh          # want: campus posts : allowed
```

Building an index over an empty collection is instant; over a large one it can
take minutes, during which the query keeps failing.

### What each one is for

| Collection group | Query |
|---|---|
| `posts` (createdAt desc) | the home feed, across every community at once |
| `members` (uid) | which communities a person belongs to |
| `sparks` (uid) | which posts a person has sparked |
| `registrations` (uid) | which events a person has registered for |
| `votes` (uid) | a person's own Locali-Tea votes |
| `reactions` (uid) | a person's own Locali-Tea reactions |

The app degrades rather than breaking without them — `db.js` catches
`failed-precondition` and falls back to walking parent documents, and the feed
sorts client-side instead of on the server. The indexes make those paths fast;
they are not required for correctness.

### The TTL policy

`tea_posts.expiresAt` gives Locali-Tea its 48-hour self-deletion. **TTL cannot
be set from this file** — turn it on once, by hand:

> Firebase Console → Firestore → Time-to-live → Create policy
> Collection group `tea_posts`, timestamp field `expiresAt`

`fetchTea()` also filters expired posts on the client, so a post is invisible
the moment it expires rather than whenever the sweeper next runs. Both are
needed: the filter for correctness, the TTL so the collection does not grow
without bound.
