# Orbit

Orbit is a social app originally built for **Manipal University Jaipur** students — one platform that merges student-created **communities**, official college **clubs**, campus **events**, and an anonymous 48-hour confession feed ("Locali-Tea").

**Status: this is a scoped-down first beta build for ~200 known testers, launching before campus-mail deliverability and full DM/notifications work could be finished.** What's live and real (Supabase-backed, not mock): sign-in (any email, not just `@muj.manipal.edu` — see the note in §2), communities/clubs (join/leave/create, posts, sparks, pins, group chat, member list), and Locali-Tea (anonymous posts/votes/comments, 48h expiry enforced server-side). Events is listing-only for now. Direct messages, notifications, and event registration are all **"Coming soon"** placeholders — deliberately, not half-wired. See [§7](#7-still-mock-or-coming-soon-for-this-build) for exactly what that means.

**Other docs in this repo:**
1. `PRODUCT_DESIGN_AND_FEATURES.docx` — what Orbit is and every feature, for anyone getting oriented without reading code.
2. `FRONTEND_ARCHITECTURE.docx` — a deeper dive into the codebase structure (written before the Supabase wiring below — still accurate on components/design system, not on the state/data section).
3. `ORBIT_MUJ_POLICY_ANALYSIS.docx` — risk/opportunity read of MUJ's official Pre-Incubation & Start-Up Policy, if/when this goes through the university's startup process.
4. `BACKEND_ARCHITECTURE_FIREBASE.docx` and `BACKEND_ARCHITECTURE.docx` — earlier backend proposals (Firebase, then an earlier Supabase sketch). **Superseded by the actual `supabase/schema.sql` in this repo** — kept for reference only.
5. `SPEC.md` — the original product spec.

---

## 1. Tech stack & running it

- **React 18** + **Vite 5** (dev server, build tool)
- **Tailwind CSS 3** for styling
- **lucide-react** for icons, **qrcode.react** for community/club QR codes
- **Supabase** (`@supabase/supabase-js`) — Postgres database, email-OTP auth, Realtime
- **Capacitor** (`@capacitor/android`, `@capacitor/app`) — wraps the built web app as a native Android APK (see [§8](#8-building-the-android-apk)); `@capacitor/app` specifically powers the hardware back-button handling and the exit review prompt (§10)
- No router (single `App.jsx` state machine — see [§6](#6-state-management)), no global state library

```bash
cp .env.example .env    # then fill in your Supabase URL + anon key — see §2
npm install
npm run dev              # Vite dev server at http://localhost:5173
npm run build             # production bundle to dist/
npm run android             # build + sync + open the Android project in Android Studio
```

## 2. Supabase setup (do this first — nothing works without it)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and run it. This creates the core tables (profiles, communities, community_members, events, event_registrations), Row Level Security policies, and the `register_for_event()` function. (The `@muj.manipal.edu`-only signup trigger this file used to create is now commented out by default — see the domain-lock note below.)
3. Run `supabase/schema_content.sql` the same way — adds `community_posts`, `community_post_sparks`, and `community_messages` (Posts/Chat tabs inside a community).
4. Run `supabase/schema_tea.sql` the same way — adds `tea_posts`, `tea_votes`, `tea_comments` (Locali-Tea). See the anonymity note at the top of that file: author identity is stored (Postgres/RLS needs it) but never selectable by the client, and these three tables are deliberately excluded from Realtime so authorship can't leak over the websocket.
5. Run `supabase/schema_tea_categories.sql` the same way (after `schema_tea.sql`) — adds the Tea/Confessions split: a `category` column on `tea_posts`, and a new `tea_reactions` table for Confessions' emoji reactions.
6. Run `supabase/schema_reviews.sql` the same way — adds `app_reviews`. Optional to run right now: the exit review prompt that used to write to it was disconnected from the UI (§10), so nothing currently inserts into this table. Kept for if that gets re-added.
7. Run `supabase/seed.sql` the same way. **This version seeds exactly one real, joinable community — "Orbit" itself** — not the old 36-community/10-club/4-event sample set. Read the warning comment at the top of the file before running it on a project that already has real data: it deletes ALL existing communities/events first, seed or not.
8. **If you're starting from a project that already ran an older version of `schema.sql`** (with the domain lock included), also run `supabase/drop_domain_lock.sql` once to remove it from that live project — editing the source file doesn't retroactively change an already-provisioned database.
9. **Run `supabase/schema_security_hardening.sql`, after every other schema file above.** This is a pre-launch security pass (see §11) — it fixes a real PII leak (every user's email was readable by any other signed-in user), locks down which columns a few UPDATE policies allow changing (pin toggles, community settings, tea votes/reactions previously had no column restriction), adds a working "remove member" policy, adds a real `reports` table (the Report button used to submit nowhere), and adds sane max-length limits on free-text fields. Safe to run on a live project — purely additive, no data touched.
10. **Run `supabase/schema_media_and_moderation.sql`, after `schema_security_hardening.sql`.** Adds: delete permissions for posts/chat messages/tea (author can delete their own anywhere, a community's creator can delete anything posted inside it, and the Orbit community's creator doubles as Locali-Tea's app-wide moderator); real image uploads for posts and chat (`image_url` columns + a `community-media` Storage bucket); an admin-only community "status image" (`avatar_url` on `communities` + a `community-avatars` bucket, creator-only write); and a shared, app-wide sticker pack (`stickers` table + bucket — any signed-in user can add a sticker, everyone can send from the pack; ships empty, no artwork included — see §12).
11. **Run `supabase/schema_admin_roles.sql`, after `schema_media_and_moderation.sql`.** Adds per-community admins (creator can promote/demote any member from the Members tab) and a per-community "only admins can post" toggle for the Posts tab, in Community settings (§13). Chat is never affected by this toggle.
12. **Run `supabase/schema_profile_bio.sql` last, after `schema_admin_roles.sql`.** Adds a real `profiles.bio` column so "Edit profile" actually saves (§14) — it silently didn't before this.
10. **Critical — configure OTP-as-a-code, not a magic link, on BOTH templates:** Supabase's default email-auth template sends a clickable link. Orbit's UI expects a typed numeric code instead. Edit **both** **Authentication → Email Templates → Magic Link** (used for returning users) **and → Confirm signup** (used the first time a new email signs up — easy to miss, and the two templates are edited separately) so the body displays `{{ .Token }}` rather than `{{ .ConfirmationURL }}`.
10. **Check the actual code length your project sends and match it in the app.** Supabase's OTP token length isn't guaranteed to be 6 digits — this project's instance sends 8. Send yourself a real test code and count the digits in the email; `OTP_LENGTH` in `src/components/Onboarding.jsx` must match exactly or verification will silently fail (the input truncates anything longer than what it's set to).
11. Go to **Settings → API**, copy the **Project URL** and **anon public** key into your `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
12. (Optional but recommended before sending this to 200 people) **Settings → Auth → Rate Limits** — Supabase's default OTP send rate limit is generous but finite; if the beta group is large and active, keep an eye on it in the dashboard during the first day.

`.env` is git-ignored — never commit real keys. The anon key is safe to ship inside the app itself (that's what it's for); it only ever does what the Row Level Security policies in the schema files allow.

**Why no domain lock right now:** Orbit was built campus-exclusive (`@muj.manipal.edu` only, enforced by a Postgres trigger — not just UI). For this first 200-person beta that trigger is off and the onboarding screen takes any email, because campus-mail deliverability (MUJ's mail server was soft-bouncing transactional mail from an unauthenticated sending domain) couldn't be fixed before launch. To re-enable it later: uncomment the function + trigger block in `supabase/schema.sql` and run it once, and swap the plain-email input in `Onboarding.jsx` back to a fixed-domain one if you want the UI to match.

## 3. Project structure

```
src/
  main.jsx                 React entry point, mounts <App />
  App.jsx                  ALL top-level state + screen routing + Supabase calls live here
  index.css                Tailwind directives + custom animation/utility classes
  lib/
    supabaseClient.js        Configured Supabase client, reads VITE_SUPABASE_* env vars
  data/
    constants.js            Static config (categories, colors) + a little mock data still kept around for the orphaned Chat.jsx (unused, see §7)
  utils/
    helpers.js               Pure functions: slugify/handle generation, trend scoring, Locali-Tea expiry, hashId (for uuid-safe ids)
    hooks.js                  useClickOutside
  components/
    Onboarding.jsx            Real Supabase email-OTP verification + profile setup — accepts any email for this build (see §2); shows the "Testing phase" beta notice
    Home.jsx                  Home feed: stories row, category filter, interest-matched picks, community cards
    Explore.jsx                Directory of Clubs / Communities (search + category filter)
    Events.jsx                 Events feed — listing only for this build, registration is a "Coming soon" state (see §7)
    Community.jsx               Community/club detail page — posts, sparks, pin, chat, and members are all real Supabase data (fetched + realtime-subscribed on mount); settings, QR are real too
    CreateCommunity.jsx          3-step "create a community" flow — writes to Supabase
    Chat.jsx                     Direct messages UI — built but currently unreferenced/unreachable, see §7
    LocaliTea.jsx                Anonymous 48h confession feed — real Supabase data now, see §5
    Profile.jsx                  User's own profile
    ReviewPrompt.jsx              Star-rating + feedback sheet — built, writes to app_reviews, but not currently wired into App.jsx (§10)
    SearchOverlay.jsx / ReportModal.jsx / TopBar.jsx / BottomNav.jsx / Common.jsx / Skeleton.jsx / EmptyState.jsx
android/                    Capacitor-generated native Android project — open this in Android Studio
capacitor.config.json       App id (com.orbit.app), app name, web build dir
supabase/
  schema.sql                 Core tables (profiles, communities, community_members, events), RLS policies, register_for_event() RPC — run once per project
  schema_content.sql          Adds community_posts, community_post_sparks, community_messages — run once, right after schema.sql
  schema_tea_categories.sql     Adds the Tea/Confessions split (tea_posts.category, tea_reactions) — run once, after schema_tea.sql
  schema_chat_pin.sql            Adds pinning a message in community chat (community_messages.pinned) — run once, after schema_content.sql
  schema_reviews.sql           Adds app_reviews — not currently written to (§10), kept for later
  schema_tea.sql               Adds tea_posts, tea_votes, tea_comments (Locali-Tea) — run once, after schema_content.sql
  drop_domain_lock.sql         One-time cleanup for a project that already ran an older schema.sql with the @muj.manipal.edu trigger baked in
  schema_security_hardening.sql  Pre-launch security pass (§11) — run after every other schema file
  schema_media_and_moderation.sql  Delete permissions (posts/chat/tea), post+chat image upload, admin-only community status image, shared sticker pack (§12) — run after schema_security_hardening.sql
  schema_admin_roles.sql       Per-community admin roles + an admin-only-posting toggle for the Posts tab (§13)
  schema_profile_bio.sql       Real profiles.bio column so Edit Profile actually saves (§14) — run LAST
  seed.sql                    Sample clubs/communities/events — run once after the schema files
```

## 4. Navigation model

Bottom tab bar has exactly **4 tabs**: **Home · Explore · Events · Profile**. No dedicated "Chat" tab:
- **Community/club chat** lives inside that community's own detail page — real.
- **Locali-Tea** opens from a coffee-cup icon in the top bar — real.
- **Direct messages** — the message icon in the top bar shows a "Coming soon" toast instead of opening anything (see §7).
- **Notifications** — the bell in the top bar opens a small dropdown that just says "Coming soon" (see §7).

`App.jsx` has no router — a manual state machine: `stage` (`"onboarding"` vs `"app"`), `activeTab`, and overlay booleans (`selectedCommunity`, `showCreate`, `searchOpen`, `teaOpen`).

## 5. What's real (backed by Supabase)

| Feature | Table(s) | Notes |
|---|---|---|
| Sign-in | `auth.users` + `profiles` | Email-OTP, any email address accepted for this build (no domain lock — see §2) |
| Session persistence | Supabase Auth session | Returning users skip onboarding entirely — checked on app load |
| Edit profile (name + bio) | `profiles.name`, `profiles.bio` | Fixed in §14 — previously only updated local state and never actually saved |
| Communities & clubs | `communities` | Same table; `official: true` marks a club. Public-readable (guests browse real data too) |
| Join / leave | `community_members` | `member_count` on `communities` stays in sync via a database trigger, not manual updates |
| Create community | `communities` + `community_members` | Blocked for unverified/guest users |
| Rename / delete community | `communities` | Creator-only, enforced by RLS |
| Events (listing) | `events` | Public-readable. Registration itself is a "Coming soon" UI state for this build — see §7 |
| Community posts | `community_posts` | Text + a real uploaded photo (optional), persists, real author, only members of that community can post (RLS-enforced) |
| Post sparks (likes) | `community_post_sparks` | One row per user per post, toggled on/off; `spark_count` on the post syncs via trigger, same pattern as member counts |
| Pin a post | `community_posts.pinned` | Creator-only (RLS-enforced), only one pinned post at a time |
| Delete a post | `community_posts` | The author can delete their own; the community's creator can delete any post inside their community (RLS-enforced, §12) |
| Community group chat | `community_messages` | Persists, real author, members-only (RLS-enforced), live via Realtime; messages can carry a real photo or a sticker (`image_url`) |
| Pin a chat message | `community_messages.pinned` | Creator-only (RLS-enforced), one pinned message at a time — see `schema_chat_pin.sql`. The seeded "Orbit" community has no creator by default, so nobody can pin there until you claim it (see that file's comment for the one-line SQL update) |
| Delete a chat message | `community_messages` | The author can delete their own; the community's creator can delete any message inside their community (RLS-enforced, §12) |
| Community status image | `communities.avatar_url` | WhatsApp-status-style: one current image on the community's page (and the joined-communities strip), creator-only to upload/replace (RLS-enforced on the `community-avatars` Storage bucket, §12) |
| Stickers | `stickers` table + `stickers` bucket | Shared, app-wide pack — any signed-in user can add a sticker image, everyone can send from the full pack in any community's chat. Ships empty (no artwork included, see §12) |
| Per-community admins | `community_members.role` | Creator-only to promote/demote a member to "admin" (Members tab). Chat is unaffected by this — see the next row |
| Admin-only posting toggle | `communities.posts_admin_only` | Per-community switch in Community settings (creator-only). When on, only the creator and promoted admins can post to the Posts tab — Chat stays open to every member regardless. Enforced server-side (RLS), not just hidden in the UI — see §13 |
| Community member list | `community_members` + `profiles` | Real names (joined from `profiles`), real join order, real interest-overlap matching against your own `profiles.interests` |
| Locali-Tea posts | `tea_posts` | Text, persists, 48h expiry enforced server-side by RLS (not just the client's countdown); author stored but never selectable by any client — see anonymity note in `schema_tea.sql`. `category` (`"tea"` or `"confession"`) drives which of the two tabs a post shows up in |
| Locali-Tea votes (Tea tab) | `tea_votes` | "true"/"cap" fact-check voting, one per user per post, toggleable; each user can only ever read their own vote rows |
| Locali-Tea reactions (Confessions tab) | `tea_reactions` | Emoji reaction instead of true/cap — one per user per post, changeable by tapping a different emoji; counts land in `tea_posts.reactions` (jsonb) via trigger, same sync pattern as everything else. Each user can only read their own reaction rows |
| Locali-Tea comments | `tea_comments` | Persists, always rendered as "Anonymous"; comments load per-post when you open it (not upfront); shared by both tabs |
| Delete a Tea/Confession post or comment | `tea_posts` / `tea_comments` | The author can delete their own; the Orbit community's creator can delete anything (app-wide moderator, since Tea has no per-community admin). Because `author_id` is never selectable (anonymity — see `schema_tea.sql`), "is this mine?" is tracked client-side the moment you post/comment, not by asking the server |
| Realtime | Supabase Realtime on `communities`, `community_posts`, `community_post_sparks`, `community_messages`, `community_members` | Live updates across everyone's screen without a manual refresh. **Not** enabled for the three `tea_*` tables — Realtime would broadcast the full row (including the hidden author column) to every subscriber regardless of column grants, which would break Locali-Tea's anonymity. It refetches on open instead. |

## 6. State management

Everything still lives in `App.jsx` local state (`useState`/`useMemo`/`useCallback`) — no Redux/Zustand/Context. The difference from a pure-mock build: the arrays that back communities/clubs/events are now populated by `supabase.from(...).select()` in a `useEffect` on mount (plus a Realtime subscription for `communities`), and the handler functions (`handleJoinToggle`, `handleCreate`, `handleRegisterEvent`, etc.) do an optimistic local update **and** an `await supabase.from(...)` call, reverting the optimistic update if the network call fails.

## 7. Still mock or Coming soon, for this build

This is the scope call made right before launch: rather than ship half-wired features, everything below is either fully real (§5) or cleanly disabled with an honest "Coming soon" state — nothing fake-looking is left reachable.

**Coming soon (intentionally disabled, no mock data shown):**
- **Direct messages** — the message icon in the top bar shows a "Coming soon" toast. `Chat.jsx` (the DM panel UI) still exists in the repo but isn't imported/rendered anywhere anymore — reconnecting it later is a matter of re-adding the import and a `messagesOpen` overlay branch in `App.jsx`, same pattern as `teaOpen`.
- **Notifications** — the bell opens a small dropdown that just says "Coming soon." No fake unread badges anywhere in the top bar.
- **Event registration & the event-linked discussion space** — Events is listing-only. The Register button is disabled and shows "Registration — coming soon" instead of doing anything. The backend for this (`register_for_event()` RPC, `event_registrations` table, `handleRegisterEvent`/`handleOpenEventCommunity` in `App.jsx`) is still fully built and working — it's just not wired to the UI right now. Re-enabling it later is a matter of passing `onRegister`/`onOpenCommunity`/`registeredEventIds` back into `<EventsScreen>` instead of `onComingSoon`.
- **Profile posts (the personal photo grid on your own Profile tab)** — found during a later re-check (§14): this used to add a fake placeholder tile to local state with no real photo, no upload, nothing saved anywhere — it reset on every reload and no one else ever saw it. Replaced with an honest "Coming soon" empty state. This is separate from community Posts (Posts tab inside a community), which is fully real (§5/§12).
- **"App preferences"** (in the Profile screen's settings menu) — had no click handler at all, found in the same re-check. Now shows the same "Coming soon" toast as everything else in this list, instead of silently doing nothing.

**Photo attachments on community posts are now real** (as of §12) — the camera button in the Posts composer uploads to a real Supabase Storage bucket and the photo actually displays; the old `has_image`-flag-only/placeholder-icon behavior is gone, though the column is still written for backward compatibility with any pre-existing rows that only ever had the flag set.

**Reports are now real** (as of the §11 security pass) — `ReportModal` submissions insert into a `reports` table (`reporter_id`, `target`, `reason`); view them from the Supabase dashboard. Previously this only `console.log`'d and nothing was ever saved despite the "submitted for review" toast.

**Removed, not gated — two leftover fake bits found post-launch:** a hardcoded "Sponsored" ad card (`MOCK_ADS`, shown on Home and Events) and a "People like you — based on your interests" section on Profile (`MOCK_SIMILAR_PEOPLE`, static names with fake shared interests unrelated to the real signed-in user). Neither was ever a real feature — there's no ads system and no cross-app people-recommendation engine — so both were deleted outright (`AdCard` component, both mock arrays, all call sites) rather than gated as Coming soon. The real, working version of "shares your interest in X" already exists inside a community's Members tab, driven by actual `profiles.interests` data.

**What changed from the previous pass:** community posts, sparks, pins, in-community chat, the member list, and all of Locali-Tea (posts/votes/comments) are now fully real per §5 — previously the two biggest fabricated pieces (`genMembers()` fake names, and Locali-Tea's entirely local `MOCK_TEA` state) are gone. The domain lock came off too, so sign-in works with any email. What's left mock or gated is now narrow and deliberate: DMs, notifications, and event registration, plus the small reports/photo-upload gaps above.

The loop worth testing with 200 people: verify with any email, see real communities/clubs, join/leave/create them, post and chat inside them with real people, spill (and read) real anonymous Locali-Tea gossip that actually expires after 48h, and browse real events.

## 8. Building the Android APK

This repo includes a ready-to-open Capacitor Android project (`android/`) — do this on a machine with **Android Studio** installed:

1. Make sure `.env` has real Supabase values (§2), then:
   ```bash
   npm install
   npm run build           # builds the web app into dist/
   npx cap sync android    # copies the new build into the native project
   ```
2. Open the `android/` folder as a project in Android Studio (not the repo root — specifically the `android` subfolder). Let Gradle sync finish (first time can take a few minutes).
3. **Build → Generate Signed Bundle / APK…** → choose **APK**.
4. **Create new…** keystore if you don't have one yet — pick a folder, a keystore password, a key alias, and a key password. **Save these somewhere safe** — you'll need the same keystore to release updates later without breaking installs for anyone who already installed the app.
5. Choose the **release** build variant, finish the wizard.
6. Android Studio will show a "locate" link when the build finishes, or find it at `android/app/release/app-release.apk`.
7. Share that `.apk` file directly (Drive link, WhatsApp, etc.) with your 200 testers. Since it's not from the Play Store, each tester needs to allow **"Install unknown apps"** for whatever app they downloaded it through (Android will prompt them automatically on first install attempt).

**Not done yet, optional polish if there's time before sharing:** the app icon is still Capacitor's default. `npx @capacitor/assets generate` can regenerate all icon sizes from a single source image (e.g. `public/favicon.svg`) — worth doing if there's an extra 30 minutes, not worth blocking the launch on.

## 9. Design system reference

Custom animation/utility classes live in `tailwind.config.js` (keyframes) and `src/index.css` (`.no-scrollbar`, `.mono`, `.glass`, `.skeleton-shimmer`, `.stagger-1`–`.stagger-8`).

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
