-- Orbit — Supabase schema, PART 9: per-community admins + an admin-only
-- posting toggle. Run this AFTER schema_media_and_moderation.sql —
-- SQL Editor → New query → paste this file only → Run.
--
-- Safe to run more than once (every step below is guarded) — if you saw
-- "column already exists" or "policy already exists" from an earlier
-- attempt, just run this version; it picks up wherever it left off.

-- ============================================================
-- 1. Per-community admin role. The creator can promote any member to
-- "admin"; only the creator can promote/demote (a promoted admin can't
-- promote other members) — matches the app's single-owner moderation
-- model, same as everything else creator-gated in this app.
-- ============================================================
alter table public.community_members
  add column if not exists role text not null default 'member' check (role in ('member', 'admin'));

revoke update on public.community_members from authenticated;
grant update (role) on public.community_members to authenticated;

drop policy if exists "community creator can change a member's role" on public.community_members;
create policy "community creator can change a member's role"
  on public.community_members for update
  to authenticated
  using (
    exists (
      select 1 from public.communities
      where id = community_members.community_id and creator_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Per-community "only admins can post" toggle — applies to the Posts
-- tab only; Chat stays open to every member regardless of this setting.
-- Creator-only to change: reuses the existing "creator can update or
-- delete their own community" RLS policy from schema.sql (using auth.uid()
-- = creator_id, no with check, so it already covers any column) — this
-- just grants the new column, same additive pattern as avatar_url in
-- schema_media_and_moderation.sql.
-- ============================================================
alter table public.communities
  add column if not exists posts_admin_only boolean not null default false;

grant update (posts_admin_only) on public.communities to authenticated;

-- ============================================================
-- 3. Enforce admin-only posting server-side, not just in the UI — a
-- modified client couldn't bypass this. Replaces the original insert
-- policy from schema_content.sql with one that adds the same check:
-- still requires membership either way, and additionally requires
-- creator-or-admin when the community has posts_admin_only turned on.
-- ============================================================
drop policy if exists "members can post in communities they've joined" on public.community_posts;
drop policy if exists "members can post, admin-only if the community requires it" on public.community_posts;

create policy "members can post, admin-only if the community requires it"
  on public.community_posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.community_members
      where community_id = community_posts.community_id and user_id = auth.uid()
    )
    and (
      exists (
        select 1 from public.communities
        where id = community_posts.community_id and posts_admin_only = false
      )
      or exists (
        select 1 from public.communities
        where id = community_posts.community_id and creator_id = auth.uid()
      )
      or exists (
        select 1 from public.community_members
        where community_id = community_posts.community_id and user_id = auth.uid() and role = 'admin'
      )
    )
  );
