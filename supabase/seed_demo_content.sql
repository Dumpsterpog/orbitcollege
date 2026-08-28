-- Orbit — OPTIONAL demo content for presentations/screenshots only.
-- Run AFTER every schema_*.sql file and after seed.sql (Supabase Dashboard
-- -> SQL Editor -> New query -> paste this file only -> Run).
--
-- What this does, in order:
--   1. Adds a spread of extra communities (beyond the single "Orbit" one
--      from seed.sql) across many categories, so Explore/Home don't look
--      empty or one-note in a demo.
--   2. Creates demo "author" accounts directly in auth.users, since
--      community_posts.author_id -> profiles.id -> auth.users.id is a real
--      foreign-key chain — there's no way to attach a believable author
--      name to a demo post without a real (if fake) signed-up user behind
--      it. These accounts are NOT meant to ever sign in for real; their
--      password hash is a placeholder, not a working credential.
--   3. Joins those demo authors to the relevant communities (member_count
--      updates automatically via the existing trigger, same as real joins).
--   4. Inserts ~20 community_posts rows, each with a real, topically
--      relevant image_url — loremflickr.com, a free hotlink-friendly photo
--      service that returns a real Flickr photo matching the given
--      keyword(s) (e.g. "sunset,campus"), with a `lock=` id so the same
--      post always shows the same photo on reload instead of a fresh
--      random one each time (important for a stable presentation/demo).
--      Swap image_url for real photos any time.
--   5. Adds sparks so counts aren't all 0.
--   6. Adds 5 official clubs (official = true communities), poster-style
--      avatar images included.
--   7. Adds 6 events with poster images (run schema_event_image.sql FIRST —
--      this needs the events.image_url column to exist).
--   8. Adds 6 Locali-Tea posts (anonymous, split across the Tea/Confessions
--      categories) so that section isn't empty in a demo either.
--
-- Posts now require a photo in the app itself (Community.jsx's Posts
-- composer) — text-only updates belong in Chat — so every row below has
-- has_image = true, matching what a real post looks like now.
--
-- Safe to re-run: every insert below is guarded with a NOT EXISTS check or
-- ON CONFLICT DO NOTHING, so running this file twice won't duplicate rows.
--
-- This is demo data, not real testers' content — delete the communities
-- named below (and their cascading posts/members) before a real public
-- launch, the same way you'd remove any other seed data.

-- ------------------------------------------------------------------
-- 1. Extra demo communities, spread across categories
-- ------------------------------------------------------------------
insert into public.communities (name, category, tags, description, member_count, creator_label, official, handle)
select * from (values
  ('MUJ Photography Club', 'Photography', ARRAY['Photography', 'Art & Design'], 'Campus photowalks, gear talk, and a place to actually get your shots seen.', 0, 'Demo', false, 'muj-photography'),
  ('Coding & Projects Hub', 'Coding & Projects', ARRAY['Coding & Projects'], 'Side projects, hackathon teams, and "can someone review my PR" — all in one place.', 0, 'Demo', false, 'coding-hub'),
  ('Campus Fitness Crew', 'Fitness', ARRAY['Fitness', 'Sports'], 'Gym buddies, morning runs, and a nudge to actually show up.', 0, 'Demo', false, 'fitness-crew'),
  ('MUJ Music Society', 'Music', ARRAY['Music'], 'Jam sessions, open mics, and finding people who play what you play.', 0, 'Demo', false, 'music-society'),
  ('Campus Foodies', 'Cooking', ARRAY['Cooking'], 'Mess reviews, hostel-room recipes, and where to actually eat near campus.', 0, 'Demo', false, 'campus-foodies'),
  ('MUJ Travel Diaries', 'Travel', ARRAY['Travel'], 'Weekend trips out of Jaipur, split-cab coordination, and photo dumps after.', 0, 'Demo', false, 'travel-diaries'),
  ('Gaming Guild MUJ', 'Gaming', ARRAY['Gaming'], 'LAN nights, ranked squads, and arguing about patch notes.', 0, 'Demo', false, 'gaming-guild'),
  ('Book Nook MUJ', 'Books & Reading', ARRAY['Books & Reading'], 'Slow reads, fast reads, and a running list of what''s worth borrowing.', 0, 'Demo', false, 'book-nook'),
  ('Sketch & Design Circle', 'Art & Design', ARRAY['Art & Design'], 'Sketchbooks, portfolio feedback, and the occasional life-drawing session.', 0, 'Demo', false, 'sketch-design')
) as v(name, category, tags, description, member_count, creator_label, official, handle)
where not exists (select 1 from public.communities where handle = v.handle);

-- ------------------------------------------------------------------
-- 2. Demo author accounts (auth.users + auto-created profiles row via the
--    existing handle_new_user() trigger from schema.sql)
-- ------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  v.email, '$2a$10$demoaccountnotforlogin.00000000000000000000000',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
from (values
  ('demo.aisha@orbit.seed'), ('demo.rohan@orbit.seed'), ('demo.zara@orbit.seed'), ('demo.karan@orbit.seed'),
  ('demo.meera@orbit.seed'), ('demo.dev@orbit.seed'), ('demo.priya@orbit.seed'), ('demo.ishaan@orbit.seed')
) as v(email)
where not exists (select 1 from auth.users where email = v.email);

-- Friendly display names — handle_new_user() only sets id + email, so this
-- fills in the name profiles.name would normally get from onboarding.
update public.profiles set name = 'Aisha'  where email = 'demo.aisha@orbit.seed'  and name = '';
update public.profiles set name = 'Rohan'  where email = 'demo.rohan@orbit.seed'  and name = '';
update public.profiles set name = 'Zara'   where email = 'demo.zara@orbit.seed'   and name = '';
update public.profiles set name = 'Karan'  where email = 'demo.karan@orbit.seed'  and name = '';
update public.profiles set name = 'Meera'  where email = 'demo.meera@orbit.seed'  and name = '';
update public.profiles set name = 'Dev'    where email = 'demo.dev@orbit.seed'    and name = '';
update public.profiles set name = 'Priya'  where email = 'demo.priya@orbit.seed'  and name = '';
update public.profiles set name = 'Ishaan' where email = 'demo.ishaan@orbit.seed' and name = '';

-- ------------------------------------------------------------------
-- 3. Join demo authors to every demo community (incl. "Orbit" itself)
-- ------------------------------------------------------------------
insert into public.community_members (community_id, user_id, role)
select c.id, p.id, 'member'
from public.communities c
join public.profiles p on p.email like 'demo.%@orbit.seed'
where c.handle in (
  'muj-photography', 'coding-hub', 'fitness-crew', 'music-society', 'campus-foodies',
  'travel-diaries', 'gaming-guild', 'book-nook', 'sketch-design', 'orbit'
)
on conflict (community_id, user_id) do nothing;

-- ------------------------------------------------------------------
-- 4. Demo posts — every one has a real, keyword-relevant photo
--    (loremflickr.com/{w}/{h}/{keywords}?lock={id} — the lock id keeps the
--    same photo across reloads instead of picking a new random match).
-- ------------------------------------------------------------------
insert into public.community_posts (community_id, author_id, text, has_image, image_url, created_at)
select c.id, p.id, v.text, true, v.image_url, now() - v.age
from (values
  ('muj-photography', 'demo.aisha@orbit.seed',  'Golden hour by the main block today. Worth the early alarm.', 'https://loremflickr.com/900/900/sunset,campus?lock=101', interval '2 hours'),
  ('muj-photography', 'demo.rohan@orbit.seed',   'Long exposure attempt #47. Still not right but getting closer.', 'https://loremflickr.com/900/900/night,longexposure?lock=102', interval '20 hours'),
  ('muj-photography', 'demo.priya@orbit.seed',   'Street photography walk through the old city this weekend.', 'https://loremflickr.com/900/900/street,photography?lock=103', interval '2 days 4 hours'),

  ('coding-hub',       'demo.rohan@orbit.seed',  'Shipped the first working build of our hackathon project at 3am. Send help (and coffee).', 'https://loremflickr.com/900/900/laptop,coding?lock=201', interval '5 hours'),
  ('coding-hub',       'demo.zara@orbit.seed',   'Whiteboard from today''s system design session. We overcomplicated it, obviously.', 'https://loremflickr.com/900/900/whiteboard,office?lock=202', interval '1 days 8 hours'),
  ('coding-hub',       'demo.dev@orbit.seed',    'Team stand-up before the demo. Nobody''s slides were ready, as usual.', 'https://loremflickr.com/900/900/team,meeting?lock=203', interval '3 days'),

  ('fitness-crew',     'demo.zara@orbit.seed',   '6am run crew was 4 people today, up from 1 last week. Growing slowly but growing.', 'https://loremflickr.com/900/900/running,morning?lock=301', interval '9 hours'),
  ('fitness-crew',     'demo.karan@orbit.seed',  'PR day. Small numbers, big feelings.', 'https://loremflickr.com/900/900/gym,fitness?lock=302', interval '2 days'),

  ('music-society',    'demo.karan@orbit.seed',  'Open mic night setup — first slot starts at 7. Come heckle us kindly.', 'https://loremflickr.com/900/900/guitar,concert?lock=401', interval '14 hours'),
  ('music-society',    'demo.meera@orbit.seed',  'Found the practice room piano actually in tune for once.', 'https://loremflickr.com/900/900/piano,music?lock=402', interval '1 days 12 hours'),

  ('campus-foodies',   'demo.priya@orbit.seed',  'Mess upgraded the Thursday menu and nobody warned us. Pleasantly surprised.', 'https://loremflickr.com/900/900/food,plate?lock=501', interval '6 hours'),
  ('campus-foodies',   'demo.ishaan@orbit.seed', 'Hostel-room baking attempt #2. Edible this time.', 'https://loremflickr.com/900/900/baking,cake?lock=502', interval '1 days 2 hours'),

  ('travel-diaries',   'demo.meera@orbit.seed',  'Weekend trip to the hills — worth every hour on that bus.', 'https://loremflickr.com/900/900/mountains,travel?lock=601', interval '4 days'),
  ('travel-diaries',   'demo.dev@orbit.seed',    'Split-cab roadtrip crew, back in one piece.', 'https://loremflickr.com/900/900/roadtrip,car?lock=602', interval '5 days'),

  ('gaming-guild',     'demo.ishaan@orbit.seed', 'LAN night setup is done. First match at 8 sharp.', 'https://loremflickr.com/900/900/keyboard,gaming?lock=701', interval '3 hours'),
  ('gaming-guild',     'demo.aisha@orbit.seed',  'New controller finally came in. Excuses officially gone.', 'https://loremflickr.com/900/900/controller,gaming?lock=702', interval '1 days 6 hours'),

  ('book-nook',        'demo.priya@orbit.seed',  'This week''s pick is sitting in the library return pile, come grab it.', 'https://loremflickr.com/900/900/library,books?lock=801', interval '10 hours'),
  ('book-nook',        'demo.karan@orbit.seed',  'Finished it in one sitting. Rare for me.', 'https://loremflickr.com/900/900/reading,book?lock=802', interval '2 days 8 hours'),

  ('sketch-design',    'demo.zara@orbit.seed',   'Life-drawing session sketches from tonight, still loosening up.', 'https://loremflickr.com/900/900/sketch,drawing?lock=901', interval '7 hours'),
  ('sketch-design',    'demo.meera@orbit.seed',  'Portfolio review night — brutal but useful feedback.', 'https://loremflickr.com/900/900/design,art?lock=902', interval '3 days 5 hours'),

  ('orbit',            'demo.aisha@orbit.seed',  'Two weeks into using Orbit for club stuff instead of five different WhatsApp groups — genuinely easier.', 'https://loremflickr.com/900/900/smartphone,app?lock=1001', interval '1 days 3 hours'),
  ('orbit',            'demo.rohan@orbit.seed',  'Campus feels a lot smaller once you can actually find the right community.', 'https://loremflickr.com/900/900/campus,college?lock=1002', interval '6 days')
) as v(handle, email, text, image_url, age)
join public.communities c on c.handle = v.handle
join public.profiles p on p.email = v.email
where not exists (
  select 1 from public.community_posts existing
  where existing.community_id = c.id and existing.author_id = p.id and existing.text = v.text
);

-- ------------------------------------------------------------------
-- 5. Sparks so counts aren't all zero (spark_count syncs via the existing
--    trigger on community_post_sparks, same as real sparks)
-- ------------------------------------------------------------------
insert into public.community_post_sparks (post_id, user_id)
select post.id, sparker.id
from public.community_posts post
join public.profiles author on author.id = post.author_id
cross join lateral (
  select p.id from public.profiles p
  where p.email like 'demo.%@orbit.seed'
  and p.id <> post.author_id
  order by random()
  limit 3
) as sparker
where author.email like 'demo.%@orbit.seed'
on conflict (post_id, user_id) do nothing;

-- ------------------------------------------------------------------
-- 6. Official clubs — official = true shows up under Explore's "Clubs"
--    sub-tab instead of "Communities". Poster-style avatar images.
-- ------------------------------------------------------------------
insert into public.communities (name, category, tags, description, member_count, creator_label, official, handle, avatar_url)
select * from (values
  ('MUJ Robotics Club', 'Coding & Projects', ARRAY['Coding & Projects'], 'Building bots for inter-college competitions — beginners welcome, no experience required.', 0, 'College', true, 'muj-robotics', 'https://loremflickr.com/900/900/robot,robotics?lock=3001'),
  ('Dramatics Society', 'Art & Design', ARRAY['Art & Design', 'Movies & TV'], 'Campus theatre — auditions every semester, backstage crew always needed.', 0, 'College', true, 'dramatics-society', 'https://loremflickr.com/900/900/theatre,stage?lock=3002'),
  ('MUJ Debate Society', 'Networking & Social', ARRAY['Networking & Social'], 'Parliamentary debate practice, MUNs, and inter-college competition prep.', 0, 'College', true, 'debate-society', 'https://loremflickr.com/900/900/podium,debate?lock=3003'),
  ('E-Cell MUJ', 'Networking & Social', ARRAY['Networking & Social', 'Coding & Projects'], 'The official Entrepreneurship Cell — pitch practice, founder talks, and incubation pointers.', 0, 'College', true, 'e-cell-muj', 'https://loremflickr.com/900/900/startup,office?lock=3004'),
  ('MUJ Sports Council', 'Sports', ARRAY['Sports', 'Fitness'], 'Official sports council — trials, fixtures, and inter-college tournament squads.', 0, 'College', true, 'sports-council', 'https://loremflickr.com/900/900/stadium,sports?lock=3005')
) as v(name, category, tags, description, member_count, creator_label, official, handle, avatar_url)
where not exists (select 1 from public.communities where handle = v.handle);

-- ------------------------------------------------------------------
-- 7. Events, poster-first (BookMyShow-style listing). Requires
--    schema_event_image.sql to have been run first (events.image_url).
-- ------------------------------------------------------------------
insert into public.events (title, category, tags, description, event_when, event_where, capacity, image_url)
select * from (values
  ('Zeal 2026 — Cultural Fest Finale', 'Music', ARRAY['Music'], 'Headline night of MUJ''s biggest cultural fest — live acts, food stalls, and a closing DJ set.', 'Sat, 30 Aug · 6:00 PM', 'MUJ Amphitheatre', 2000, 'https://loremflickr.com/900/506/concert,stage?lock=4001'),
  ('HackMUJ — 24hr Hackathon', 'Coding & Projects', ARRAY['Coding & Projects'], 'Build something in 24 hours, ship a demo, win prizes. Teams of up to 4.', 'Fri, 5 Sep · 9:00 AM', 'CS Block Labs', 150, 'https://loremflickr.com/900/506/hackathon,laptop?lock=4002'),
  ('Inter-College Sports Meet', 'Sports', ARRAY['Sports'], 'Track, field, and team-sport fixtures against neighbouring colleges.', 'Mon, 8 Sep · 7:00 AM', 'MUJ Sports Complex', 500, 'https://loremflickr.com/900/506/stadium,athletics?lock=4003'),
  ('Open Mic & Comedy Night', 'Music', ARRAY['Music'], 'Stand-up, poetry, and music — sign up at the door for a 5-minute slot.', 'Wed, 3 Sep · 8:00 PM', 'Student Activity Center', 200, 'https://loremflickr.com/900/506/microphone,comedy?lock=4004'),
  ('Design Thinking Workshop', 'Art & Design', ARRAY['Art & Design'], 'Hands-on workshop on rapid prototyping, run by the Sketch & Design Circle.', 'Thu, 4 Sep · 3:00 PM', 'Design Studio, Block 6', 60, 'https://loremflickr.com/900/506/design,workshop?lock=4005'),
  ('Startup Pitch Day — E-Cell', 'Networking & Social', ARRAY['Networking & Social'], 'Student founders pitch to a panel of local investors and alumni.', 'Fri, 12 Sep · 11:00 AM', 'Main Auditorium', 300, 'https://loremflickr.com/900/506/startup,presentation?lock=4006')
) as v(title, category, tags, description, event_when, event_where, capacity, image_url)
where not exists (select 1 from public.events where title = v.title);

-- ------------------------------------------------------------------
-- 8. Locali-Tea demo posts — anonymous by design (author stored but never
--    selectable by any client, see schema_tea.sql), split across both tabs.
-- ------------------------------------------------------------------
insert into public.tea_posts (author_id, text, category, created_at)
select p.id, v.text, v.category, now() - v.age
from (values
  ('demo.aisha@orbit.seed',  'Anyone else''s hostel WiFi been down since Monday? 📶', 'tea', interval '3 hours'),
  ('demo.rohan@orbit.seed',  'Mess is actually serving good food this week — screenshot this before it changes back.', 'tea', interval '7 hours'),
  ('demo.zara@orbit.seed',   'Library WiFi is faster than hostel WiFi and nobody talks about it enough.', 'tea', interval '11 hours'),
  ('demo.karan@orbit.seed',  'I''ve skipped every 8am class this month and I regret nothing.', 'confession', interval '5 hours'),
  ('demo.meera@orbit.seed',  'Still haven''t told my roommate I ate their entire box of cookies.', 'confession', interval '9 hours'),
  ('demo.dev@orbit.seed',    'Pretended to be sick to skip a group project meeting. Not proud, not sorry.', 'confession', interval '15 hours')
) as v(email, text, category, age)
join public.profiles p on p.email = v.email
where not exists (
  select 1 from public.tea_posts existing where existing.author_id = p.id and existing.text = v.text
);
