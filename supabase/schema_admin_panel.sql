-- Orbit — PART 17: admin panel access.
--
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.
--
-- ============================================================ READ FIRST
-- Everything below keys off auth.uid(). The app currently signs in with
-- Firebase and talks to Supabase with only the anon key, so auth.uid() is
-- NULL on every request and NONE of these policies will ever match.
--
-- Verified, not assumed:
--   curl "$URL/rest/v1/community_posts?select=id&limit=2" -H "apikey: $ANON"
--   -> []            (policy is `to authenticated`, caller is anon)
--   curl "$URL/rest/v1/communities?select=id&limit=2"     -H "apikey: $ANON"
--   -> [{...},{...}] (policy is `to anon`)
--
-- So this file is correct but inert until Supabase can identify the caller.
-- Fix that first, by one of:
--   1. Supabase Third-Party Auth with Firebase (Dashboard -> Authentication
--      -> Sign In / Providers -> Third Party Auth). Then pass the Firebase
--      ID token as the Supabase access token. This is the intended path and
--      needs no server of your own.
--   2. Mint a Supabase-compatible JWT from a Cloud Function using the
--      Supabase JWT secret, then supabase.auth.setSession(). Never put that
--      secret in the browser.
--   3. Move the data layer to Firestore, where Firebase auth applies
--      natively (the migration discussed earlier).
--
-- Until then the admin panel renders and is wired, but reads return empty
-- and writes are refused — by the database, which is the correct failure.
-- =======================================================================


-- 1. Who is an admin ----------------------------------------------------

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Nobody can grant themselves this. It is not in the authenticated update
-- grant (schema_security_hardening.sql allows name and interests only), so
-- it can only be set from the SQL editor or with the service_role key.
--
-- Make yourself an admin by email:
--   update public.profiles set is_admin = true where email = 'you@example.com';

-- SECURITY DEFINER so a policy ON profiles can call it without recursing
-- into the very policy being evaluated. STABLE so Postgres calls it once per
-- statement rather than once per row.
create or replace function public.is_orbit_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_orbit_admin() from anon;
grant execute on function public.is_orbit_admin() to authenticated;


-- 2. What an admin can see ---------------------------------------------

-- Full profile rows, email included. This is the one place email is legible,
-- and it is why is_admin cannot be self-assigned.
drop policy if exists "admins read every profile" on public.profiles;
create policy "admins read every profile"
  on public.profiles for select
  to authenticated
  using (public.is_orbit_admin());

grant select on public.profiles to authenticated;

drop policy if exists "admins read every message" on public.community_messages;
create policy "admins read every message"
  on public.community_messages for select
  to authenticated
  using (public.is_orbit_admin());

drop policy if exists "admins read every report" on public.reports;
create policy "admins read every report"
  on public.reports for select
  to authenticated
  using (public.is_orbit_admin());

grant select on public.reports to authenticated;


-- 3. What an admin can moderate ----------------------------------------

-- Take down any post, in any community.
drop policy if exists "admins delete any post" on public.community_posts;
create policy "admins delete any post"
  on public.community_posts for delete
  to authenticated
  using (public.is_orbit_admin());

-- Take down any chat message.
drop policy if exists "admins delete any message" on public.community_messages;
create policy "admins delete any message"
  on public.community_messages for delete
  to authenticated
  using (public.is_orbit_admin());

-- Remove a whole community.
drop policy if exists "admins delete any community" on public.communities;
create policy "admins delete any community"
  on public.communities for delete
  to authenticated
  using (public.is_orbit_admin());

-- Edit any community (rename, recategorise, flag official, lock posting).
drop policy if exists "admins update any community" on public.communities;
create policy "admins update any community"
  on public.communities for update
  to authenticated
  using (public.is_orbit_admin())
  with check (public.is_orbit_admin());

grant update on public.communities to authenticated;

-- Locali-Tea moderation. Reading a tea post is already public; author_id
-- stays unselectable, so an admin can remove content without ever learning
-- who wrote it. That is deliberate: moderation should not cost anonymity.
drop policy if exists "admins delete any tea post" on public.tea_posts;
create policy "admins delete any tea post"
  on public.tea_posts for delete
  to authenticated
  using (public.is_orbit_admin());

drop policy if exists "admins delete any tea comment" on public.tea_comments;
create policy "admins delete any tea comment"
  on public.tea_comments for delete
  to authenticated
  using (public.is_orbit_admin());

-- Resolve a report.
drop policy if exists "admins resolve reports" on public.reports;
create policy "admins resolve reports"
  on public.reports for update
  to authenticated
  using (public.is_orbit_admin())
  with check (public.is_orbit_admin());

grant update (resolved, resolved_at) on public.reports to authenticated;

-- Events: create, edit, remove.
drop policy if exists "admins manage events" on public.events;
create policy "admins manage events"
  on public.events for all
  to authenticated
  using (public.is_orbit_admin())
  with check (public.is_orbit_admin());

grant insert, update, delete on public.events to authenticated;


-- 4. Aggregate views for the overview ----------------------------------

-- schema_admin_dashboard.sql revoked these from anon and authenticated, so
-- they were service_role-only and unreachable from a browser. Re-grant them
-- to authenticated and gate on the admin check instead. security_invoker
-- makes the view run as the caller so the underlying RLS still applies.
alter view public.admin_dashboard_overview set (security_invoker = on);
alter view public.admin_daily_activity set (security_invoker = on);
alter view public.admin_top_communities set (security_invoker = on);
alter view public.admin_reports_detail set (security_invoker = on);

grant select on public.admin_dashboard_overview to authenticated;
grant select on public.admin_daily_activity to authenticated;
grant select on public.admin_top_communities to authenticated;
grant select on public.admin_reports_detail to authenticated;

-- admin_recent_users is deliberately NOT re-granted. It selects email with
-- no filter; the panel reads profiles directly instead, where the admin
-- policy above governs access row by row.
revoke all on public.admin_recent_users from anon, authenticated;


-- 5. Verify -------------------------------------------------------------
--
--   update public.profiles set is_admin = true where email = 'you@example.com';
--   select public.is_orbit_admin();          -- true when run as that user
--   select * from public.admin_dashboard_overview;
--
-- And confirm a non-admin still cannot read email:
--   set role authenticated;
--   select email from public.profiles limit 1;   -- expect zero rows
--   reset role;
