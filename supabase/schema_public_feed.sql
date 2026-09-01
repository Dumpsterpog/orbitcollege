-- Orbit — PART 16: let signed-out visitors read the campus feed.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement is guarded).
--
-- WHY
-- communities and events were already `to anon` (schema.sql lines 93-95 and
-- 178-180), so a signed-out visitor could see that clubs and events exist but
-- not a single thing anyone had said. Home was therefore permanently empty
-- before sign-in, which is the worst possible first impression of a product
-- whose whole pitch is "here is what's happening on campus".
--
-- This grants anon exactly two things: read on community_posts, and read on
-- profiles.name so those posts have a byline. Nothing else changes.
--
-- WHAT THIS DELIBERATELY DOES NOT TOUCH
--   tea_posts / tea_comments / tea_votes / tea_reactions
--       Locali-Tea stays authenticated-only. Its anonymity model depends on
--       author_id never being selectable, and widening the audience for it is
--       a separate decision with a different risk profile.
--   community_messages
--       Community chat stays members-only. A feed post is broadcast; a chat
--       message is not, and the two should not be conflated.
--   profiles.email / interests / bio
--       schema_security_hardening.sql revoked table-wide select on profiles
--       precisely because email leaked to every signed-in user. anon gets a
--       strictly narrower column grant than authenticated has: id and name,
--       nothing more.
--   Every write path
--       anon gets select and nothing else. Posting, sparking, joining and
--       reporting all still require a session.
--
-- REVERSING IT
-- If you want the feed private again:
--   drop policy if exists "posts are readable by anyone" on public.community_posts;
--   revoke select (id, name) on public.profiles from anon;
-- The old authenticated-only policy is left in place untouched, so dropping
-- these two lines restores the previous behaviour exactly.


-- 1. Posts become publicly readable ------------------------------------

-- The existing "posts are readable by any signed-in user" policy stays as it
-- is. Postgres ORs policies together, so adding this one widens the audience
-- without altering what a signed-in user can already do.
drop policy if exists "posts are readable by anyone" on public.community_posts;

create policy "posts are readable by anyone"
  on public.community_posts for select
  to anon
  using (true);

-- RLS decides which ROWS are visible; grants decide which COLUMNS are. anon
-- has neither by default, so the policy above does nothing without this.
grant select on public.community_posts to anon;


-- 2. Bylines -----------------------------------------------------------

-- The feed query joins profiles!author_id(name) to render "posted by X".
-- Without a profiles read for anon the join returns null and every post is
-- attributed to "Someone".
drop policy if exists "profile names are readable by anyone" on public.profiles;

create policy "profile names are readable by anyone"
  on public.profiles for select
  to anon
  using (true);

-- Column-scoped on purpose, and narrower than the authenticated grant in
-- schema_security_hardening.sql (which also allows interests and created_at).
-- A signed-out visitor needs a name to put under a post and nothing else.
grant select (id, name) on public.profiles to anon;


-- 3. Verify ------------------------------------------------------------
--
-- Run these after applying. The first should return rows; the second should
-- return exactly the two column grants and no others.
--
--   set role anon;
--   select id, text, created_at from public.community_posts limit 5;
--   reset role;
--
--   select column_name, privilege_type
--   from information_schema.column_privileges
--   where table_name = 'profiles' and grantee = 'anon';
--
-- If the second query returns a row for `email`, stop and re-run
-- schema_security_hardening.sql — that would be a leak, not a feature.
