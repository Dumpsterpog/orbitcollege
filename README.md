# Orbit

Orbit is a social app originally built for **Manipal University Jaipur** students — one platform that merges student-created **communities**, official college **clubs**, campus **events**, and an anonymous 48-hour confession feed ("Locali-Tea").

**Status: a web dashboard, running on Firebase.** Two earlier shapes of this project are still visible in the sections below, and are worth naming up front because the build log from §10 onward was written under them:

- It began as a **Capacitor Android app**. That wrapper is gone; this is a browser app now.
- Its backend was **Supabase (Postgres + RLS)**. That is gone too. See [§2](#2-firebase-setup-do-this-first) for what replaced it.

What is live and real (Firestore-backed, not mock): Google sign-in, communities and clubs (join/leave/create, posts, sparks, pins, group chat, member list), events with registration, and Locali-Tea. Direct messages and notifications are still **"Coming soon"** placeholders, deliberately, not half-wired. See [§7](#7-still-mock-or-coming-soon-for-this-build).

**Other docs in this repo:**
1. `PRODUCT_DESIGN_AND_FEATURES.docx` — what Orbit is and every feature, for anyone getting oriented without reading code.
2. `FRONTEND_ARCHITECTURE.docx` — a deeper dive into the codebase structure. Predates both the Supabase wiring and the Firebase migration: still accurate on components and the design system, not on state or data.
3. `ORBIT_MUJ_POLICY_ANALYSIS.docx` — risk/opportunity read of MUJ's official Pre-Incubation & Start-Up Policy, if/when this goes through the university's startup process.
4. `BACKEND_ARCHITECTURE_FIREBASE.docx` and `BACKEND_ARCHITECTURE.docx` — earlier backend proposals. The Firebase one is closer to the truth than it was when written, but neither is authoritative: `firestore.rules` and `src/lib/db.js` are.
5. `SPEC.md` — the original product spec, from before any backend existed.

---

## 1. Tech stack & running it

- **React 18** + **Vite 5** (dev server, build tool)
- **Tailwind CSS 3** for styling
- **lucide-react** and **Material Symbols Rounded** for icons, **qrcode.react** for community/club QR codes
- **Firebase** (`firebase`) — Firestore for data, Firebase Auth for Google sign-in, Cloud Storage for uploads
- No router (single `App.jsx` state machine, see [§6](#6-state-management)), no global state library

```bash
cp .env.example .env    # then fill in the six VITE_FIREBASE_* values, see §2
npm install
npm run dev              # Vite dev server at http://localhost:5173
npm run build            # production bundle to dist/
```

---

## 2. Firebase setup (do this first)

Everything the app needs from Firebase is in three places: the env file, the rules, and a few console toggles.

**1. Env.** Copy the six values from Firebase Console → Project settings → Your apps → SDK setup, into `.env`. They are public identifiers compiled into the bundle, not secrets; the rules are what protect the data. Never put a service-account JSON in a `VITE_*` variable.

**2. Enable Google sign-in.** Authentication → Sign-in method → Google. Then Authentication → Settings → Authorized domains, add `localhost` and your deploy domain, or sign-in fails with `auth/unauthorized-domain`.

**3. Publish the rules.** Paste `firestore.rules` into Firestore Database → Rules → Publish. Until you do, the default rules deny everything and every list in the app is empty. The file is commented throughout; the section on Locali-Tea is worth reading before changing anything, because the anonymity guarantee depends on its exact shape.

**4. Indexes.** `firestore.indexes.json` lists the six collection-group indexes the app needs. You do not have to apply it by hand: the first time each query runs, the browser console prints a click-to-create link that builds exactly the right index. Deploying the file with `firebase deploy --only firestore:indexes` does the same thing without the wait.

**5. Locali-Tea expiry.** Firestore Console → Firestore → Time-to-live → Create policy, collection group `tea_posts`, timestamp field `expiresAt`. The client also filters expired posts on read, so a post disappears the moment it expires rather than whenever the sweeper next runs. Both are needed: the filter for correctness, the TTL so the collection does not grow without bound.

**6. Make yourself an admin** (only if you want the admin tool). Firestore → `profiles` → your uid → add `isAdmin` (boolean) = `true`. Nothing in the app can set this field on itself; the rules explicitly exclude it from self-updates.

**On the campus domain lock:** Orbit was designed campus-exclusive (`@muj.manipal.edu` only). That is currently not enforced, because campus-mail deliverability could not be fixed before launch. To reinstate it, the check belongs in the rules, as a condition on profile creation against `request.auth.token.email`, not in the UI, where anyone can bypass it.

---

## 3. Project structure

```
src/
  main.jsx                 React entry point, mounts <App />
  App.jsx                  ALL top-level state + screen routing live here
  index.css                Tailwind directives + design tokens + animation/utility classes
  lib/
    firebase.js              Firebase app singleton, reads VITE_FIREBASE_* env vars
    db.js                    The entire data layer: every read, watcher and mutation
    authService.js           Google sign-in, session restore, profile bootstrap
  data/
    constants.js            Static config (categories, colors)
  utils/
    helpers.js               Pure functions: slugify/handle generation, trend scoring, Locali-Tea expiry, hashId
    hooks.js                  useClickOutside
  components/
    Onboarding.jsx            5-step onboarding, sign-in last
    Home.jsx                  Campus feed: latest posts, open events, suggested communities
    Explore.jsx                Directory of Clubs / Communities (search + category filter)
    Events.jsx                 Events feed with real registration
    Community.jsx               Community/club detail: posts, sparks, pin, chat, members, settings, QR
    CreateCommunity.jsx          3-step "create a community" flow
    Chat.jsx                     Direct messages UI, built but currently unreachable, see §7
    LocaliTea.jsx                Anonymous 48h confession feed
    Profile.jsx / Settings.jsx   Profile and settings screens
    SearchOverlay.jsx / ReportModal.jsx / TopBar.jsx / Sidebar.jsx / Common.jsx / Skeleton.jsx / EmptyState.jsx
firestore.rules            Security rules. These ARE the access model, read them before changing data shape
firestore.indexes.json     Collection-group and composite indexes, plus the tea TTL note
```

`src/lib/db.js` is the file to read first. It is the only place that talks to Firestore, and its header documents the three things Postgres did for free that Firestore does not: joins (so author names are denormalised onto posts), counters (so `sparkCount` is maintained by transactions rather than triggers), and cross-table atomicity (so event registration is one `runTransaction` rather than one stored procedure).

The admin tool is a **separate app** in a separate folder outside this repo, at `Desktop/orbit-admin`. It has its own README.

---

## 4. Navigation model

A sidebar on desktop, a bottom tab bar on narrow screens: **Home · Explore · Events · Profile**, plus Settings. No dedicated "Chat" tab:
- **Community/club chat** lives inside that community's own detail page, real.
- **Locali-Tea** opens from a coffee-cup icon, real.
- **Direct messages** and **notifications** are "Coming soon" (see §7).

`App.jsx` has no router, just a manual state machine: `stage` (`"onboarding"` vs `"app"`), `activeTab`, and overlay booleans (`selectedCommunity`, `showCreate`, `searchOpen`, `teaOpen`).

---

## 5. What's real (backed by Firestore)

Firestore is a document store, so the shape below is nested rather than relational. A community owns its posts; a post owns its sparks. This is why deleting a community has to walk its subcollections explicitly: Firestore does not cascade.

| Feature | Path | Notes |
|---|---|---|
| Sign-in | Firebase Auth + `profiles/{uid}` | Google sign-in. No passwords, and no OTP email to deliver, which was the thing that blocked the campus rollout |
| Session persistence | Firebase Auth | Returning users skip onboarding, via `onAuthStateChanged` on load |
| Edit profile (name + bio) | `profiles/{uid}` | Self-writable, except `isAdmin`, which the rules refuse |
| Communities & clubs | `communities/{id}` | Same collection; `official: true` marks a club. Publicly readable, so guests browse real data |
| Join / leave | `communities/{id}/members/{uid}` | The doc id is the uid, so joining twice is impossible by construction. `memberCount` moves in the same transaction |
| Create community | `communities` + first member doc | Signed-in only |
| Rename / delete community | `communities/{id}` | Creator-only, enforced by rules |
| Events | `events/{id}` | Publicly readable. Registration creates `registrations/{uid}` and joins the linked community, in one transaction |
| Community posts | `communities/{id}/posts/{postId}` | Text plus an optional uploaded photo. The author's name is stored on the post, because Firestore has no joins |
| Post sparks (likes) | `.../posts/{postId}/sparks/{uid}` | One doc per user per post. `sparkCount` moves with `increment()` inside the same transaction as the spark doc, so the two cannot drift |
| Pin a post | `posts/{postId}.pinned` | Creator-only, one at a time |
| Delete a post | `posts/{postId}` | Author, community creator, community admin, or app admin |
| Community group chat | `communities/{id}/messages/{msgId}` | Members-only reads, enforced server-side by a rule that checks membership. Live via `onSnapshot` |
| Pin a chat message | `messages/{msgId}.pinned` | Creator-only, one at a time |
| Community status image | `communities/{id}.avatarUrl` | Creator-only upload to Cloud Storage |
| Stickers | `stickers/{id}` | Shared app-wide pack. Ships empty, no artwork included |
| Per-community admins | `members/{uid}.role` | Creator-only to promote or demote |
| Admin-only posting toggle | `communities/{id}.postsAdminOnly` | Enforced in the rules, not merely hidden in the UI. Chat stays open to every member regardless |
| Member list | `communities/{id}/members` | Real names, real join order, real interest-overlap matching against your own profile |
| Locali-Tea posts | `tea_posts/{id}` | 48h expiry via a TTL policy plus a client-side filter. **No author field exists on the document at all**, see below |
| Locali-Tea votes | `tea_posts/{id}/votes/{uid}` | true/cap fact-checking, one per user, readable only by that user |
| Locali-Tea reactions | `tea_posts/{id}/reactions/{uid}` | Emoji reaction for Confessions, same shape |
| Locali-Tea comments | `tea_posts/{id}/comments/{id}` | Always rendered as "Anonymous", loaded when a post is opened |
| Reports | `reports/{id}` | Anyone signed in can file one; only an admin can read the queue |
| Live updates | `onSnapshot` on communities, the feed, community posts, messages and events | Replaces the five Realtime channels |

**How Locali-Tea's anonymity works now, and why it had to change.** Under Postgres, the author column existed on the row and was hidden by a column grant. Firestore has no per-field read permission: if a document is readable, every field in it is readable, and no amount of the client not asking changes that. So ownership moved out of the post entirely, into a `tea_authors/{teaId}` document whose read rule is `if false`: denied to every client, including admins, including the author. The rules can still consult it, because `get()` inside a rule runs server-side and is not bound by the permission it is evaluating. That is what lets "only the author may delete this" hold without the author ever being knowable. The create rule additionally refuses any post that tries to include an `authorId`, so a later client bug cannot quietly undo it.

This is a stronger guarantee than the one it replaced. Before, the identity was present and something chose not to show it. Now it is not present.

---

## 6. State management

Everything still lives in `App.jsx` local state (`useState`/`useMemo`/`useCallback`), with no Redux, Zustand or Context. The arrays that back communities, clubs, events and the feed are populated by three `onSnapshot` watchers from `db.js`, started once on mount:

```js
useEffect(() => db.watchCommunities(setDbCommunities), []);
useEffect(() => db.watchEvents(setEvents), []);
useEffect(() => db.watchFeed(setFeedPosts), []);
```

Each returns its own unsubscribe function, which is why the effect body returns it directly. This replaced three fetch effects plus three separate Realtime channel subscriptions, and it removed the whole class of bug where a fetch and a subscription disagreed about the current state.

The handler functions (`handleJoinToggle`, `handleCreate`, `handleRegisterEvent`) still do an optimistic local update and roll it back if the write fails. The rollback matters slightly less than it used to, because the snapshot watcher corrects local state on the next server round trip regardless.

## 7. Still mock or Coming soon, for this build

This is the scope call made right before launch: rather than ship half-wired features, everything below is either fully real (§5) or cleanly disabled with an honest "Coming soon" state — nothing fake-looking is left reachable.

**Coming soon (intentionally disabled, no mock data shown):**
- **Direct messages** — the message icon in the top bar shows a "Coming soon" toast. `Chat.jsx` (the DM panel UI) still exists in the repo but isn't imported/rendered anywhere anymore — reconnecting it later is a matter of re-adding the import and a `messagesOpen` overlay branch in `App.jsx`, same pattern as `teaOpen`.
- **Notifications** — the bell opens a small dropdown that just says "Coming soon." No fake unread badges anywhere in the top bar.
- **Profile posts (the personal photo grid on your own Profile tab)** — found during a later re-check (§14): this used to add a fake placeholder tile to local state with no real photo, no upload, nothing saved anywhere — it reset on every reload and no one else ever saw it. Replaced with an honest "Coming soon" empty state. This is separate from community Posts (Posts tab inside a community), which is fully real (§5/§12).
- **"App preferences"** (in the Profile screen's settings menu) — had no click handler at all, found in the same re-check. Now shows the same "Coming soon" toast as everything else in this list, instead of silently doing nothing.

**Event registration is now real.** It was listing-only for the beta. The stored procedure that backed it (`register_for_event()`) has no equivalent in Firestore, so it is reimplemented in `db.js` as a single `runTransaction`: create or reuse the event's linked community, write the registration, join the community, bump the member count. Either all four happen or none do.

**Reports are real.** `ReportModal` writes to `reports/{id}`. Users can file one but cannot read the queue: the read rule requires an admin. View them in the admin tool, or in the Firebase console.

**Removed, not gated — two leftover fake bits found post-launch:** a hardcoded "Sponsored" ad card (`MOCK_ADS`, shown on Home and Events) and a "People like you — based on your interests" section on Profile (`MOCK_SIMILAR_PEOPLE`, static names with fake shared interests unrelated to the real signed-in user). Neither was ever a real feature — there's no ads system and no cross-app people-recommendation engine — so both were deleted outright (`AdCard` component, both mock arrays, all call sites) rather than gated as Coming soon. The real, working version of "shares your interest in X" already exists inside a community's Members tab, driven by actual `profiles.interests` data.

**What changed from the previous pass:** community posts, sparks, pins, in-community chat, the member list, and all of Locali-Tea (posts/votes/comments) are now fully real per §5 — previously the two biggest fabricated pieces (`genMembers()` fake names, and Locali-Tea's entirely local `MOCK_TEA` state) are gone. The domain lock came off too, so sign-in works with any email. What's left mock or gated is now narrow and deliberate: DMs, notifications, and event registration, plus the small reports/photo-upload gaps above.

The loop worth testing with 200 people: verify with any email, see real communities/clubs, join/leave/create them, post and chat inside them with real people, spill (and read) real anonymous Locali-Tea gossip that actually expires after 48h, and browse real events.

## 8. Deploying

This is a static Vite build. `npm run build` produces `dist/`, which any static host will serve; `vercel.json` is already here for Vercel.

Two things must be true on the deploy domain or sign-in fails in ways that look like app bugs:

- The domain is listed under Firebase Authentication → Settings → Authorized domains. Otherwise `signInWithPopup` rejects with `auth/unauthorized-domain`.
- `firestore.rules` is published. Unpublished, the default rules deny every read, and the app renders as though the database were empty.

**On the Android app.** Orbit shipped its beta as a Capacitor-wrapped APK. That wrapper, the `android/` project and `capacitor.config.json` were removed when this became a web dashboard. Nothing in the current source imports `@capacitor/*`. Rebuilding a native wrapper later is possible, but it would start from `npx cap add android` rather than from anything still in this repo. Some sections below were written while the APK existed and still refer to it.

## 9. Design system reference

Custom animation/utility classes live in `tailwind.config.js` (keyframes) and `src/index.css` (`.no-scrollbar`, `.mono`, `.glass`, `.skeleton-shimmer`, `.stagger-1`–`.stagger-8`).

---

**Everything from here down is the build log**, kept in the order it happened. It records how the app got to where it is, which is often the only place a decision's reasoning survives. Read it as history, not as instructions: the sections below predate the Firebase migration, so they refer to Postgres tables, RLS policies, SQL files under `supabase/`, and the Android APK. None of those exist any more. §2 and §5 above are the current picture, and §18 explains the move.

---

## 10. Testing-phase notice

Since this build goes out to ~200 known testers rather than the public, that's made explicit instead of pretending it's a finished app: a small amber "Testing phase" pill next to the logo plus a one-line disclaimer ("You're using an early beta of Orbit — things may break or change"), visible on every onboarding step (`Onboarding.jsx`).

**Exit review prompt — built, then intentionally disconnected.** An earlier pass added an optional star-rating + feedback sheet shown on the Android hardware back button before the app exits, backed by a real `app_reviews` table. Per a later product call, it's not needed — the code was removed from the active flow (`App.jsx`'s `backButton` listener now just closes overlays and exits, no prompt in between), but `ReviewPrompt.jsx` and `supabase/schema_reviews.sql` are still in the repo if this gets revisited later. The back button still closes whatever's open first (community detail, search, Locali-Tea, notifications dropdown, report modal), same as tapping that screen's own back/close button — that part's unrelated to the review prompt and stayed.

**After `npm install`**, run `npx cap sync android` again before your next APK build so the `@capacitor/app` plugin (used for the back-button handling above) gets linked into the native project.

## 11. Security hardening pass (before wider APK sharing)

A full audit of every RLS policy, column grant, and client input across the app, done before sharing the APK beyond the initial small test group. Everything found is fixed in `supabase/schema_security_hardening.sql` (run it — see §2, step 9) plus small JS changes already included in this handoff. Nothing here required changing the app's actual features or behavior.

**Found and fixed:**
- **PII leak (the important one):** `profiles.email` was readable by any signed-in user via a direct API call — the "readable by any signed-in user" policy had no column restriction. Now any authenticated user can only ever `select` `id, name, interests, created_at` from other profiles; email is no longer exposed. The app never displayed this in the UI, but it was fetchable regardless. This matters more than it used to, since sign-in now accepts personal emails instead of only campus addresses.
- **Loose UPDATE grants:** pin-toggle policies (posts, chat messages), community settings, profile updates, and Locali-Tea votes/reactions all allowed rewriting *any* column of a row once the row-level check passed — not just the one column the app UI actually sends. In practice this meant, for example, a community's creator could (via a raw API call, not through the app) rewrite another member's post text, or flip a community's `official` badge on themselves. Every one of these is now locked to the exact column(s) the app sends — zero change to how the app behaves, since it never touched the other columns anyway.
- **Fake report submissions:** `ReportModal` said "Report submitted for review" but only `console.log`'d — nothing was saved anywhere. Now inserts into a real `reports` table.
- **Dead "Remove" button:** the Members tab had a Remove button for admins with no click handler and no policy allowing it. Now works — deletes the membership row, backed by a new RLS policy.
- **No length limits anywhere:** community/post/chat/confession text fields had no cap, client or server side. Added sane `maxLength` on the inputs and matching `CHECK` constraints in the database (defense in depth — a modified client couldn't bypass the input's `maxLength`).
- **Confession reactions accepted any string:** `tea_reactions.emoji` had no constraint, so a direct API call could insert an arbitrary string instead of one of the five emoji the UI offers. Added a `CHECK` constraint matching the client's fixed set.

**Reviewed and already fine, no change needed:** no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere (React escapes all rendered text by default, so posts/chat/confessions can't inject HTML/scripts); `.env` is git-ignored and only the public anon key ships in the app (never a service-role key); Locali-Tea's realtime exclusion (author_id can't leak over the websocket) was already correctly designed; error handling on Supabase calls consistently does optimistic-update-then-rollback, so a flaky network doesn't corrupt local state.

**Known, accepted limitation (not fixed, by design for a 200-person known-tester beta):** there's no server-side rate limiting on posting/messaging beyond Supabase's own defaults — a technically inclined tester could script spam via the API directly instead of the UI. Not worth the added complexity for a private beta shared only with people you know; worth revisiting before any public/wider release.

## 12. Delete, real photos, community status image, stickers

Four additions on top of the security-hardening pass, all in `supabase/schema_media_and_moderation.sql` (§2, step 10). All Storage buckets created by this file are public for reads (so images just load via a plain URL, no signed-URL plumbing) but RLS-gated for writes.

- **Delete.** Posts (`community_posts`), chat messages (`community_messages`), and Locali-Tea posts/comments (`tea_posts`/`tea_comments`) can now be deleted by whoever posted them, from a trash-can icon shown only on your own content — or by the relevant admin: a community's creator for anything posted inside that community, and the Orbit community's creator (the app's only real "admin" role) for any Locali-Tea content, since Tea isn't tied to a community. Deletes are optimistic in the UI with rollback on failure, same pattern as everything else in this app. Tea's client-side "is this mine?" tracking (since the server never reveals authorship) is stored in `localStorage` the moment you post — see the comment above `loadIdSet()`/`saveIdSet()` in `App.jsx`.
- **Real post + chat photos.** The Posts composer's camera button now opens a real file picker instead of just toggling a flag, and uploads to the `community-media` bucket (path `{your_user_id}/...`, so you can only ever write into your own folder) — the resulting photo actually renders in the feed instead of a placeholder icon.
- **Community status image.** Admin-only, WhatsApp-status-style: one current image per community, shown on that community's own page and in the joined-communities "stories" strip on Home. Only the community's creator can upload or replace it (enforced both by column-level `GRANT`/RLS on `communities.avatar_url` and by `storage.foldername()`-scoped RLS on the `community-avatars` bucket, path `{community_id}/...`). Set it from the gear icon → Community settings.
- **Stickers.** A shared, app-wide pack rather than per-community — any signed-in user can add a sticker image (tap "Add one" in the sticker picker, next to the chat input), and everyone can send from the full pack in any community's chat. **No artwork ships with this migration** — there was no way to generate custom sticker art as part of this handoff, so the picker starts empty and grows organically as testers/you upload real images. Sending a sticker is just a chat message with an image and no text.

## 13. Per-community admins + admin-only posting

Added in `supabase/schema_admin_roles.sql` (§2, step 11), on top of everything in §12.

- **Admins.** Each community's creator can promote any member to "admin" from the Members tab (a "Make admin" link next to Remove, creator-only) and demote them back the same way. Only the creator can do this — a promoted admin can't promote anyone else, keeping moderation single-owner like the rest of the app.
- **Admin-only posting.** A toggle in Community settings ("Only admins can post"), creator-only, per community. When on, only the creator and promoted admins can post to that community's **Posts** tab — everyone who's joined can still read posts and use **Chat** exactly as before; this toggle only ever touches the Posts tab. Enforced server-side via the `community_posts` insert policy (checks `communities.posts_admin_only` and the poster's `community_members.role`), so a modified client can't bypass it — off by default for every existing and new community, nothing changes until a creator turns it on.

## 14. Live-beta bug fixes (found during real two-tester testing)

Three real bugs, found and fixed after §11–13 shipped, while testing with actual users rather than solo.

**Root cause of "posts disappear when you leave and reopen a community" — finally found.** Every earlier attempt at this (the `getSession()` guard, then a retry-once fetch) was chasing the wrong cause. The real one, found via a Supabase Edge Logs export during a live reproduction: every fetch of `community_posts` was returning **HTTP 300 "Multiple Choices"** from PostgREST — `more than one relationship was found for community_posts and profiles`, because the embedded `profiles(name)` in the select didn't say *which* foreign key to join through. That 300 isn't a normal error Supabase surfaces loudly; the client just got `data: null` back, silently, every single time — meaning the local `posts` list only ever showed what was optimistically added by your own posting, and was wiped back to empty on every fresh mount (i.e. every time you reopened the community). Fixed by hinting the exact relationship in `Community.jsx`'s select: `profiles!author_id(name)` instead of `profiles(name)`. This is deterministic (not timing-related), so unlike the earlier fixes it should fully resolve the bug rather than just reduce how often it happens. The `getSession()` guard and one retry are still in place as harmless extra safety, not the actual fix.

**Community status image silently not saving.** If the image upload to Storage failed for any reason, the settings sheet closed immediately afterward anyway (the parent always closes it once `onSave` fires) — so any error was shown and hidden in the same instant, and the name/description still saved, producing a plain "Updated" toast that looked like full success. Fixed: on an upload error, `CommunitySettings` now stops before calling `onSave` at all, so the sheet stays open and the error stays visible until you retry or clear the image.

**Profile "Edit profile" (name + bio) wasn't actually saving.** Both only ever wrote to local React state — `bio` didn't even have a database column. Editing your name looked like it worked (it updated your own screen) but never reached `profiles.name`, so it never showed to anyone else and reverted on your next login. Fixed for real in `supabase/schema_profile_bio.sql` (§2, step 12) + `App.jsx`'s new `handleUpdateProfile`, which does an actual `profiles` update. While re-checking Profile for anything else in the same shape, two more were found and gated as **Coming soon** instead of fixed (out of scope for this pass — see §7): the personal "Posts" photo grid on your own Profile tab (was pushing fake placeholder tiles to local state, no real photo ever saved) and the "App preferences" menu item (had no click handler at all).

Locali-Tea's comment threads also got a small, unrelated improvement in this same round: since Tea intentionally never uses Supabase Realtime (broadcasting would leak the anonymous author's identity — see `schema_tea.sql`), an open post's comments now poll a plain `SELECT` every 4 seconds while you're looking at it, so a discussion still feels live without ever putting anyone's identity on the wire.

## 15. Black-and-white rebrand + Home dashboard (this pass)

**Theme.** The app is now strictly grayscale — every violet/indigo brand accent and every category's distinct hue (`COLOR_MAP` in `data/constants.js`) is gone, replaced by zinc-only shades. A real light/dark toggle was added (`utils/useTheme.js`, `.dark` class on `<html>`, `darkMode: "class"` in `tailwind.config.js`), switchable from Profile → settings menu, defaulting to dark and persisted in `localStorage`. Category icons are still visually distinct from each other (different icon glyphs + four grayscale "weight" tiers), just not by color.

**Home dashboard.** Three additions to `HomeScreen` (`components/Home.jsx`), all gated behind "no category filter active" so they don't clutter a filtered view:
- **Recent in your communities** — the newest post from each community you've joined, one row per community (icon, name, snippet, relative time), tap to open. Backed by a new `joinedLatestPosts` fetch in `App.jsx`: pulls the 100 newest `community_posts` rows across your joined communities and keeps only the first (newest) per `community_id` client-side — no new SQL/table needed, `community_posts` already had everything required.
- **Top communities right now** — the same trend score already used for the feed's "#N Trending" badge (`communityTrendScore` in `utils/helpers.js`), now also surfaced as its own horizontal row of the top 5.
- **Ad placeholder** — a static, non-interactive "Ad space" card. Note the contradiction with §7 above: an earlier pass *removed* a hardcoded `MOCK_ADS` "Sponsored" card for pretending to be real sponsored content with no ad system behind it. This one is different on purpose — it's honestly labeled as an empty reserved slot ("nothing runs here yet"), not dressed up as a real ad, so it doesn't fake anything. Swap it for a real ad SDK/network integration later without having to touch the dashboard's layout.

The existing "Matched to your interests" row and interest-first category ordering (already in `HomeScreen`, driven by `interestMatchCount` in `utils/helpers.js`) got no code changes this pass, but now do more — they compare against each community's real `tags` (multi-select at creation, see the "Tag its interests" step in `CreateCommunity.jsx`) instead of just the one primary category, so matching is materially better without touching the matching logic itself.

## 16. Real desktop layout (this pass)

Previously, opening Orbit on a desktop browser just centered the mobile UI inside a phone-shaped card (`sm:max-w-sm`, rounded corners, shadow) — same content, just floating in empty space either side. This pass adds an actual wide-screen layout at the `lg` breakpoint (1024px+), on top of the phone-frame (which still applies from `sm` up to just below `lg`, and to the onboarding/auth screens at every width):

- **`components/Sidebar.jsx`** (new) — a left nav shown only at `lg+` (`hidden lg:flex`), replacing `BottomNav` (which gets `lg:hidden`) at that width: logo, the same four tabs, Search/Locali-Tea shortcuts, and a "Create community" button pinned to the bottom when verified. Wired to the exact same handlers (`goToTab`, `openTea`, `openSearch`, `openCreate` — the last three now shared functions in `App.jsx` instead of inline closures duplicated between `TopBar` and `Sidebar`) so desktop and mobile nav can't drift apart in behavior.
- **`App.jsx` shell** — split into `shellClass` (unchanged phone-frame, still used for the loading/onboarding screens at every width — an auth screen staying centered is normal) and `shellClassApp` (used only once signed in): identical up through `md`, but at `lg` it drops `max-w-sm`/rounded corners/shadow and switches to `lg:flex-row`, becoming Sidebar + a right-hand content pane instead of a single floating card. The content pane itself caps at `lg:max-w-5xl lg:mx-auto` so text-heavy screens (Community, Profile, Locali-Tea) don't stretch edge-to-edge on very wide monitors.
- **Card lists go multi-column at `lg`** — Home's per-category feed, Explore's directory, and Events' listing all switch from a single-column `space-y-2.5` stack to `lg:grid lg:grid-cols-2 xl:grid-cols-3` (3 columns from `xl`, 1440px+). The horizontal-scroll rows (stories, Top communities, Matched to your interests) were left as-is — they already read fine wide, no change needed.
- **`TopBar`** hides its own logo at `lg` (`lg:hidden` — Sidebar already shows one) and right-aligns its icon row (`lg:justify-end`) instead of leaving an empty gap where the logo used to be.
- **Sidebar collapses to icons, expands on hover** (later refinement) — rests at `w-[76px]` (icon-only rail), widens to `w-64` on `:hover` via a plain CSS width transition, with each label's own `opacity-0 group-hover:opacity-100` fade so text doesn't just pop in. No overlay/absolute positioning — it's a flex sibling, so the content pane visibly reflows during the hover transition; deliberate trade-off for staying simple rather than needing new positioning context on the shell. The internal divider line that used to sit between the nav list and the Search/Locali-Tea shortcuts is gone — spacing (`mt-6`) does the separation instead of a border.

Not part of this pass: no new desktop-only content or feature was added — same data, same screens, same handlers, just a different chrome/grid at wide widths. Verified with a clean `npm run build`; visual confirmation on an actual desktop browser is still worth doing since this environment has no way to render a real browser screenshot.

## 17. Home rebuilt as an Instagram-style "Latest posts" feed (this pass)

Home's dashboard used to end in a full community directory (category pills + every community grouped by category) — that's now Explore's job only, so Home doesn't duplicate it. In its place: a single vertical feed of the newest posts from every community app-wide (not just joined ones), newest first, image-first cards — `App.jsx`'s new `feedPosts` query (`community_posts` ordered by `created_at desc`, `profiles!author_id(name)` relationship hint, same fix as Community.jsx's posts query needed). Sparking a post from this feed is real, not mock — writes to `community_post_sparks`, same table/optimistic-update pattern the Community page's Posts tab already used. The feed is also Realtime-subscribed (`home-feed-realtime` channel, no `community_id` filter — unlike Community.jsx's per-community channel) so a post from anyone, anywhere, shows up live without a manual refresh; INSERT/UPDATE payloads only carry raw columns (no joined author name), so those two re-fetch just that one row.

**Ads.** Every 3rd item in the feed is a demo "Sponsored" card (`DEMO_ADS` in `Home.jsx`) — local-business/event style, clearly labeled, tapping it shows a "demo content" toast rather than pretending to link anywhere real. This is different from the honestly-empty ad slot removed in §15/§16's note: that one was for the real app with no ad system; these three exist specifically so the ad-every-3-posts layout has something to show in a demo/presentation. Swap `DEMO_ADS` for a real ad network's response later without touching the layout.

**Demo content.** `supabase/seed_demo_content.sql` (new, optional, run after every other schema/seed file) adds 9 extra communities spread across categories, 8 demo author accounts (created directly in `auth.users` since `community_posts.author_id` is a real foreign key chain down to it — see the file's own comments), and ~20 demo posts so the feed and Explore aren't empty for a demo. Clearly marked as demo data in the file itself; delete those communities before a real public launch.

**Events got a poster image.** `supabase/schema_event_image.sql` (new, run once before `seed_demo_content.sql`) adds `events.image_url`. `EventCard` (`Events.jsx`) now renders it as a 16:9 poster with the category pill overlaid on top — closer to a ticketing app's listing (BookMyShow-style) than a plain text row. An event with no image falls back to the old plain-header layout, so this doesn't break any event created before the column existed.

**Seed data now covers every section, not just posts.** `seed_demo_content.sql` grew three more sections: 5 official clubs (`official = true`, so they show up under Explore's **Clubs** sub-tab, each with a poster-style avatar image), 6 events with poster images (fest, hackathon, sports meet, open mic, workshop, startup pitch day), and 6 Locali-Tea posts split across the Tea/Confessions tabs. Every section now has at least 5 real-looking listings for a demo instead of just the posts feed.

**Every section now auto-refreshes.** Communities/Clubs and Community detail (posts/chat/members) were already Realtime-subscribed; this pass adds an `events-realtime` channel (same pattern, safe to broadcast in full — no anonymity concern) so Events updates live too. Locali-Tea stays deliberately off Realtime (see the comment on `fetchTea` in `App.jsx` — broadcasting would leak the anonymous author over the wire even with column grants restricting a normal `select`), so instead it now polls every 5 seconds while the screen is open, on top of the existing 4-second poll on an open post's comments — still "auto refresh," just a short interval instead of a live push for that one section.

**Posts now require a photo.** `Community.jsx`'s Posts composer no longer accepts a text-only post (the old emoji quick-post row and the "post with just text" path are both gone) — a photo is mandatory, caption is optional, so the Posts tab and Home's feed read as an actual photo feed instead of a mix of text and photo posts. Plain text still works exactly as before in **Chat** (`community_messages` is untouched) — the composer's own hint text ("Just want to say something? Use Chat instead.") points there. Seed images switched from picsum.photos (unrelated random photos) to loremflickr.com with per-post keywords and a `lock=` id (e.g. `sunset,campus` for a photography post, `laptop,coding` for a hackathon post) — topically relevant and stable across reloads instead of a random unrelated photo each time.

---

## 18. The Supabase to Firebase migration

**What forced it.** Orbit authenticated with Firebase and stored data in Supabase. Nothing bridged the two. Supabase's row-level security decides permissions from `auth.uid()`, which reads a Supabase-issued JWT; the app only ever sent the anonymous key, so `auth.uid()` was NULL on every request, for every user, signed in or not.

That is verifiable from outside the app. With the anon key, `communities` returns rows and `community_posts` returns `[]` — the first table has a policy for anonymous readers, the second requires `to authenticated`, and no user ever satisfied it. Every policy written against a signed-in user had never once matched. The workarounds accumulated in `Community.jsx` (a `getSession()` before every read, a 400ms retry, a join hint to dodge a PostgREST 300) were all treating symptoms of that.

The two ways out were to bridge Firebase sign-in into Supabase by minting a Supabase-compatible JWT, or to drop one of the two backends. Dropping one was less machinery and left less to go wrong, and Firebase was the half that already worked.

**What moved:**

| Was | Is |
|---|---|
| `supabase.from(...).select()` scattered across `App.jsx` and `Community.jsx` | `src/lib/db.js`, the only module that touches the database |
| RLS policies across 15 SQL files | `firestore.rules`, one file |
| Realtime channels | `onSnapshot` watchers |
| `register_for_event()` stored procedure | one `runTransaction` in `db.js` |
| Triggers keeping `member_count`, `spark_count` | `increment()` inside the transaction that causes the change |
| SQL joins for author names | denormalised `authorName` on each post |
| A hidden `author_id` column on `tea_posts` | a `tea_authors` collection nobody can read |
| Three Storage buckets | three path prefixes in one bucket |

**What Firestore does not give you back.** Three things Postgres did for free now cost something, and `db.js` says so at the top so the cost is visible where the code is:

- **No joins.** A post has to carry its author's display name. If someone renames themselves, old posts keep the old name until something rewrites them. This is a real regression, accepted because the alternative is an extra read per post on every feed render.
- **No triggers.** Every counter is maintained by the transaction that changes the thing being counted. Miss one and it drifts, silently, with nothing to reconcile against.
- **No cascade.** Deleting a community leaves its posts, members and messages as unreachable documents. `deleteCommunityDeep` in the admin tool walks them in batches first. It is not atomic; if it fails partway, run it again.

**What did not carry over: the data.** This was a rewrite of the data layer, not an export. Communities, events, posts and profiles that live in the Supabase project are still there and are not in Firestore. Firestore starts empty. Nothing in this repo reads Supabase any more, so if that content matters, export it from the Supabase dashboard before the project lapses and write it in through `db.js`, which enforces the same shapes the rules expect.

**What was deleted:** the `supabase/` directory (17 SQL files), `src/lib/supabaseClient.js`, the in-app `Admin.jsx` (superseded by the standalone tool), and the `@supabase/supabase-js` dependency. All of it is recoverable from git history if the migration needs to be re-read against the schema it came from.
