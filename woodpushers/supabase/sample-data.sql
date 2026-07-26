-- Sample data to light up the map for UI testing before the real scraper runs.
-- Paste into Supabase SQL Editor and Run. Safe to re-run: it clears its own
-- previous sample rows first. These are real, well-known public spots plus a
-- couple of placeholder clubs; edit or delete freely.

-- 1. Launch cities (clean slugs).
insert into cities (name, country_code, slug, population, location) values
  ('Sydney', 'AU', 'sydney', 5312000, st_setsrid(st_makepoint(151.2093, -33.8688), 4326)::geography),
  ('Paris',  'FR', 'paris',  11020000, st_setsrid(st_makepoint(2.3522, 48.8566), 4326)::geography)
on conflict (slug) do update
  set population = excluded.population, location = excluded.location;

-- 2. Clear previous sample rows so this stays idempotent.
delete from places where source = 'import'
  and city_id in (select id from cities where slug in ('sydney', 'paris'));

-- 3. Sample places.
insert into places (name, kind, description, address, city_id, location, website, source, source_url, confidence, status)
select v.name, v.kind, v.description, v.address,
       (select id from cities where slug = v.slug),
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       v.website, 'import', v.website, 0.9, 'approved'
from (values
  -- Sydney
  ('sydney', 'Hyde Park Giant Chess', 'park', 'Public giant chess board in Hyde Park North.', 'Hyde Park, Sydney NSW', 151.2110, -33.8709, null),
  ('sydney', 'St George Leagues Chess Club', 'club', 'Long-running club, weekly rated games.', 'Kogarah, Sydney NSW', 151.1330, -33.9660, null),
  ('sydney', 'Sydney Chess Centre', 'club', 'City club with casual and rated play.', 'Sydney CBD NSW', 151.2070, -33.8760, null),
  ('sydney', 'Ryde-Eastwood Leagues Chess', 'club', 'Suburban club, beginners welcome.', 'West Ryde, Sydney NSW', 151.0900, -33.8070, null),
  -- Paris
  ('paris', 'Jardin du Luxembourg', 'park', 'Famous outdoor chess tables by the Senate garden.', 'Jardin du Luxembourg, 75006 Paris', 2.3372, 48.8462, null),
  ('paris', 'Cercle d''Echecs de Paris', 'club', 'Central club, evenings and weekends.', 'Paris 75011', 2.3760, 48.8570, null),
  ('paris', 'Place de la Bastille chess', 'park', 'Casual pickup games near the square.', 'Place de la Bastille, 75011 Paris', 2.3690, 48.8530, null),
  ('paris', 'Jardin des Tuileries', 'park', 'Games near the fountains in fine weather.', 'Jardin des Tuileries, 75001 Paris', 2.3270, 48.8635, null)
) as v(slug, name, kind, description, address, lng, lat, website);

-- 4. Optional: seed a city chat link so the Paris city page shows a Join button.
-- insert into city_chats (city_id, whatsapp_invite_url)
-- select id, 'https://chat.whatsapp.com/REPLACE_ME' from cities where slug = 'paris'
-- on conflict (city_id) do update set whatsapp_invite_url = excluded.whatsapp_invite_url;

select 'sample data loaded' as status,
  (select count(*) from places where source = 'import') as sample_places;
