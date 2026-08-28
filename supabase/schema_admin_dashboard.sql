-- Orbit — Supabase schema, PART 15: admin dashboard (Supabase-side only).
-- Run this AFTER schema_profile_bio.sql — SQL Editor → New query → paste
-- this file only → Run. Safe to run more than once.
--
-- This is deliberately NOT an in-app screen — it's a handful of views you
-- query from the Supabase SQL Editor (or browse in Table Editor) whenever
-- you want a snapshot of the app. Every view below is explicitly locked to
-- the project owner: `anon`/`authenticated` (i.e. the app itself, and
-- anyone with just the public anon key) get nothing back from these — only
-- someone with real access to this Supabase project can query them. See
-- the usage notes at the bottom for the exact commands to run.

-- ============================================================
-- 1. Reports needed a way to mark something as handled — there was no
-- resolved/unresolved distinction at all before this, every report was
-- permanently "new."
-- ============================================================
alter table public.reports add column if not exists resolved boolean not null default false;
alter table public.reports add column if not exists resolved_at timestamptz;

-- ============================================================
-- 2. Headline numbers — one row, the whole app at a glance.
-- ============================================================
create or replace view public.admin_dashboard_overview as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where created_at > now() - interval '24 hours') as new_users_today,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(*) from public.communities where official = false) as total_communities,
  (select count(*) from public.communities where official = true) as total_clubs,
  (select count(*) from public.community_members) as total_memberships,
  (select count(*) from public.community_posts) as total_posts,
  (select count(*) from public.community_posts where created_at > now() - interval '24 hours') as posts_today,
  (select count(*) from public.community_messages) as total_messages,
  (select count(*) from public.community_messages where created_at > now() - interval '24 hours') as messages_today,
  (select count(*) from public.tea_posts where coalesce(category, 'tea') = 'tea') as total_tea_posts,
  (select count(*) from public.tea_posts where category = 'confession') as total_confessions,
  (select count(*) from public.tea_posts where created_at > now() - interval '24 hours') as tea_activity_today,
  (select count(*) from public.stickers) as total_stickers,
  (select count(*) from public.reports) as total_reports,
  (select count(*) from public.reports where resolved = false) as unresolved_reports;

-- ============================================================
-- 3. Daily trend, last 14 days — signups/posts/messages/tea per day, so
-- you can see whether activity is growing or dying, not just a total.
-- ============================================================
create or replace view public.admin_daily_activity as
select
  d.day,
  (select count(*) from public.profiles p where p.created_at::date = d.day) as new_users,
  (select count(*) from public.community_posts c where c.created_at::date = d.day) as posts,
  (select count(*) from public.community_messages m where m.created_at::date = d.day) as messages,
  (select count(*) from public.tea_posts t where t.created_at::date = d.day) as tea_posts
from (
  select generate_series(current_date - interval '13 days', current_date, interval '1 day')::date as day
) d
order by d.day desc;

-- ============================================================
-- 4. Community leaderboard — every community/club with its real activity
-- counts, not just member_count.
-- ============================================================
create or replace view public.admin_top_communities as
select
  c.id,
  c.name,
  c.official,
  c.member_count,
  (select count(*) from public.community_posts p where p.community_id = c.id) as post_count,
  (select count(*) from public.community_messages m where m.community_id = c.id) as message_count,
  c.creator_label,
  c.created_at
from public.communities c
order by c.member_count desc, post_count desc;

-- ============================================================
-- 5. Reports, newest first, with reporter/target so you can act on them —
-- mark one handled with:
--   update public.reports set resolved = true, resolved_at = now() where id = '<uuid>';
-- ============================================================
create or replace view public.admin_reports_detail as
select id, reporter_id, target, reason, resolved, resolved_at, created_at
from public.reports
order by resolved asc, created_at desc;

-- ============================================================
-- 6. Recent signups — who joined lately.
-- ============================================================
create or replace view public.admin_recent_users as
select id, name, email, created_at
from public.profiles
order by created_at desc
limit 50;

-- ============================================================
-- 7. Lock every view above to the project owner only. Views in the public
-- schema are exposed over the REST API by default — without this, the
-- app's own public anon key could be used to pull these stats directly.
-- ============================================================
revoke all on public.admin_dashboard_overview from anon, authenticated;
revoke all on public.admin_daily_activity from anon, authenticated;
revoke all on public.admin_top_communities from anon, authenticated;
revoke all on public.admin_reports_detail from anon, authenticated;
revoke all on public.admin_recent_users from anon, authenticated;
