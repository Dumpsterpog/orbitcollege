-- Orbit — adds a poster image to events (BookMyShow-style listing card).
-- Run once, after schema.sql. Safe to run on a live project — purely
-- additive, no existing rows touched (image_url is nullable; EventCard
-- already handles an event with no image gracefully).

alter table public.events add column if not exists image_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_image_url_length'
  ) then
    alter table public.events
      add constraint events_image_url_length check (char_length(image_url) <= 2048);
  end if;
end $$;
