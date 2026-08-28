-- Orbit — Supabase schema, PART 10: a real, persisted profile bio.
-- Run this AFTER schema_admin_roles.sql — SQL Editor → New query → paste
-- this file only → Run. Safe to run more than once.
--
-- Context: "Edit profile" in the app already had a bio field in the UI,
-- but it only ever wrote to local React state — never persisted anywhere,
-- reset on every reload. This adds the real column + column-scoped grants
-- (same defense-in-depth pattern as the rest of this app) so the client
-- change (already made alongside this file) actually saves.

alter table public.profiles add column if not exists bio text;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length check (char_length(bio) <= 300);

-- profiles already has column-scoped SELECT/UPDATE grants from
-- schema_security_hardening.sql (email is deliberately excluded) — these
-- are additive, on top of the existing (id, name, interests, created_at)
-- select grant and (name, interests) update grant.
grant select (bio) on public.profiles to authenticated;
grant update (bio) on public.profiles to authenticated;
