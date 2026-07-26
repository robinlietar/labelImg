-- Curated seed for Sydney and Paris from editorial knowledge, to use until the
-- live scraper has run. Honest labeling: rows I am confident about are
-- 'approved'; plausible-but-unverified rows are 'pending' so they land in the
-- admin queue for a human check. Coordinates are suburb-level approximations.
-- Idempotent: replaces earlier 'import' rows for these two cities (including
-- the old sample-data.sql rows). Paste into Supabase SQL Editor and Run.

insert into cities (name, country_code, slug, population, location) values
  ('Sydney', 'AU', 'sydney', 5312000, st_setsrid(st_makepoint(151.2093, -33.8688), 4326)::geography),
  ('Paris',  'FR', 'paris',  11020000, st_setsrid(st_makepoint(2.3522, 48.8566), 4326)::geography)
on conflict (slug) do update
  set population = excluded.population, location = excluded.location;

delete from places where source = 'import'
  and city_id in (select id from cities where slug in ('sydney', 'paris'));

insert into places (name, kind, description, address, city_id, location, website, opening_notes, source, source_url, confidence, status)
select v.name, v.kind, v.description, v.address,
       (select id from cities where slug = v.slug),
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       v.website, v.opening_notes, 'import', v.website, v.confidence, v.status
from (values
  -- ============ SYDNEY ============
  ('sydney', 'Hyde Park Giant Chess', 'park',
   'Outdoor giant chess set in Nagoya Gardens, Hyde Park North. Pickup games most days in good weather.',
   'Hyde Park, Elizabeth St side, Sydney NSW', 151.2117, -33.8747, null, 'Daytime, weather dependent', 0.95, 'approved'),
  ('sydney', 'Rooty Hill RSL Chess Club', 'club',
   'One of the biggest chess clubs in NSW, hosts major weekenders and club nights at the RSL.',
   '33 Railway St, Rooty Hill NSW', 150.8442, -33.7711, null, 'Club nights weekly, check club calendar', 0.85, 'approved'),
  ('sydney', 'St George Chess Club', 'club',
   'Historic southern Sydney club with weekly rated tournaments.',
   'Kogarah area, Sydney NSW', 151.1330, -33.9663, null, 'Weekly club night', 0.8, 'approved'),
  ('sydney', 'Norths Chess Club', 'club',
   'Strong north-shore club playing at Norths Cammeray.',
   '12 Abbott St, Cammeray NSW', 151.2130, -33.8210, null, 'Weekly club night', 0.8, 'approved'),
  ('sydney', 'Canterbury Chess Club', 'club',
   'Long-running inner-west club with rated events.',
   'Lakemba/Campsie area, Sydney NSW', 151.0760, -33.9200, null, 'Weekly club night', 0.7, 'pending'),
  ('sydney', 'Parramatta RSL Chess Club', 'club',
   'Western Sydney club meeting at Parramatta RSL.',
   'Corner of Macquarie and O''Connell St, Parramatta NSW', 151.0040, -33.8180, null, 'Weekly club night', 0.7, 'pending'),
  ('sydney', 'Eastern Suburbs Chess Club', 'club',
   'Eastern suburbs club around Bondi Junction.',
   'Bondi Junction area, Sydney NSW', 151.2470, -33.8910, null, null, 0.6, 'pending'),
  ('sydney', 'Sydney Academy of Chess', 'shop',
   'Chess school and retailer in the CBD, coaching and school programs.',
   'Sydney CBD NSW', 151.2070, -33.8710, null, 'Business hours', 0.7, 'pending'),
  ('sydney', 'Sydney University Chess Club', 'club',
   'Student club at USyd, casual nights in semester.',
   'Camperdown Campus, Sydney NSW', 151.1870, -33.8880, null, 'Semester weeknights', 0.55, 'pending'),

  -- ============ PARIS ============
  ('paris', 'Jardin du Luxembourg (coin des echecs)', 'park',
   'The classic Paris outdoor chess corner, tables near the Orangerie. Bring a set or join a game.',
   'Jardin du Luxembourg, angle sud-ouest, 75006 Paris', 2.3336, 48.8470, null, 'Daily in daylight, busiest weekends', 0.95, 'approved'),
  ('paris', 'Clichy Echecs 92', 'club',
   'One of the strongest clubs in France, many titled players, just over the peripherique in Clichy.',
   'Clichy, Hauts-de-Seine', 2.3060, 48.9020, null, 'Club nights and weekend team events', 0.85, 'approved'),
  ('paris', 'Lutece Echecs', 'club',
   'Historic Left Bank club in the 5th arrondissement.',
   '75005 Paris', 2.3500, 48.8440, null, 'Weekly club nights', 0.7, 'pending'),
  ('paris', 'Blitz Society', 'cafe',
   'Chess cafe-bar concept in Saint-Germain. Verify current opening before traveling.',
   'Rue Mazarine area, 75006 Paris', 2.3380, 48.8540, null, 'Evenings, verify current status', 0.5, 'pending'),
  ('paris', 'Asnieres - Le Grand Echiquier', 'club',
   'Major club in Asnieres-sur-Seine, north-west of Paris.',
   'Asnieres-sur-Seine', 2.2850, 48.9110, null, 'Club nights weekly', 0.7, 'pending')
) as v(slug, name, kind, description, address, lng, lat, website, opening_notes, confidence, status);

select 'knowledge seed loaded' as status,
  (select count(*) from places p join cities c on c.id = p.city_id
    where p.source = 'import' and c.slug in ('sydney','paris')) as rows_loaded,
  (select count(*) from places p join cities c on c.id = p.city_id
    where p.source = 'import' and c.slug in ('sydney','paris') and p.status = 'approved') as visible_on_map;
