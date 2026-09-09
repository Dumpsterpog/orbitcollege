# Deployment notes

Both config files in this repo are validated against a schema by the tool that
reads them, and neither tolerates a `"//"` key. JSON has no comments, so the
explanations that used to live inside them live here instead.

---

## Maintenance mode

**It is currently OFF. The site is live.**

`src/main.jsx` reads `VITE_MAINTENANCE` and shows the maintenance screen only
when it is exactly `"true"`.

### Taking the site down

Set `VITE_MAINTENANCE=true` in the deployment environment and redeploy. Vite
inlines the value at build time, so it needs a rebuild either way -- there is
no runtime switch to flip in a hurry. If you need one, that is a hosting-level
rewrite, not a client flag.

The default used to be the other way round, on while the rebuild was in
progress, so a deploy that forgot to configure anything stayed down rather
than accidentally opening. That is right for a site that is not ready and
wrong for one that is: a config slip should not take a running product
offline.

### While it is on

`Maintenance` is returned *instead of* `App`, not over it. `App` starts the
Firebase auth listener and the Firestore subscriptions, so never mounting it
means no session restore, no sign-in popup and no reads.

`/privacy` and `/terms` stay reachable. They are static, they touch no data,
and a privacy policy that disappears during maintenance is the one page you
cannot take down.

It is not a security control. The bundle still downloads, so it stops ordinary
visitors seeing a half-finished app; it does not protect data.
`firestore.rules` does that.

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
