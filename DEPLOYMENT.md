# Deployment notes

Both config files in this repo are validated against a schema by the tool that
reads them, and neither tolerates a `"//"` key. JSON has no comments, so the
explanations that used to live inside them live here instead.

---

## Maintenance mode

**It is currently ON.** `src/main.jsx` renders `src/components/Maintenance.jsx`
as the landing page.

It is returned *instead of* `App`, not on top of it. `App` is what starts the
Firebase auth listener and the Firestore subscriptions, so never mounting it
means no session restore, no sign-in popup and no reads. Nobody signs in
because that code does not run.

### Going live again

In `src/main.jsx`, delete the `MAINTENANCE` constant and the first branch of
`Root`, leaving the `/privacy` and `/terms` checks and `App`. Then redeploy.

Nothing else needs changing: `vercel.json` is back to the plain SPA fallback,
so hosting serves the app normally and the switch lives entirely in one file.

### What still works while it is on

`/privacy` and `/terms` are checked before the maintenance branch and still
render the real pages. They are static, they touch no data, and a privacy
policy that disappears during maintenance is the one page you cannot take
down.

### What this is not

A security control. The bundle is still downloaded, so anyone reading it can
see the app code and work around the switch. It stops ordinary visitors seeing
a half-finished app; it does not protect data. `firestore.rules` does that,
and it is unaffected.

A hosting-level rewrite would avoid serving the bundle at all, which is
strictly stronger. This is the accepted trade for the screen being a real
component that follows the app's own theme.

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
