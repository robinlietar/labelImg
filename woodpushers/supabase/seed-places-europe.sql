-- Europe expansion pack. Idempotent-ish: fixes the Blitz Society row, seeds
-- confidently-known chess venues in major European cities (uncertain ones go
-- to the admin queue as pending), and sets scrape_priority so the DAILY CRON
-- automatically enriches the 20+ biggest European cities next, with no manual
-- runs needed. Requires migration 0017 (scrape_priority) from upgrade.sql.

-- 1) Correct Blitz Society (owner-confirmed address in Saint-Germain).
update places set
  address = '4 Rue du Sabot, 75006 Paris',
  location = st_setsrid(st_makepoint(2.3303, 48.8531), 4326)::geography,
  description = 'Chess cafe-bar in Saint-Germain-des-Pres, boards at every table.',
  confidence = 0.9,
  status = 'approved'
where name = 'Blitz Society' and source = 'import';

-- 2) Known venues across Europe. Skips any city not yet in the cities table.
insert into places (name, kind, description, address, city_id, location, website, opening_notes, source, source_url, confidence, status)
select v.name, v.kind, v.description, v.address,
       c.id,
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       null, v.opening_notes, 'import', null, v.confidence, v.status
from (values
  -- London
  ('london', 'Chess and Bridge (London Chess Centre)', 'shop',
   'The UK''s best known chess shop, boards and books, central London.',
   '44 Baker Street, London W1U', -0.1567, 51.5205, 'Business hours', 0.85, 'approved'),
  ('london', 'Battersea Chess Club', 'club',
   'One of the most active clubs in the UK, south-west London.',
   'Battersea, London SW11', -0.1650, 51.4750, 'Weekly club nights', 0.75, 'approved'),
  ('london', 'Hammersmith Chess Club', 'club',
   'Large west London club with rated events and casual nights.',
   'Hammersmith, London W6', -0.2230, 51.4930, 'Weekly club nights', 0.65, 'pending'),
  ('london', 'Muswell Hill Chess Club', 'club',
   'North London club, friendly and competitive sections.',
   'Muswell Hill, London N10', -0.1440, 51.5900, null, 0.6, 'pending'),
  -- Amsterdam
  ('amsterdam', 'Max Euweplein giant chess', 'park',
   'The famous outdoor giant board on the square named for world champion Max Euwe.',
   'Max Euweplein, Amsterdam', 4.8820, 52.3620, 'Daylight hours', 0.9, 'approved'),
  ('amsterdam', 'Max Euwe Centrum', 'other',
   'Chess museum and study center dedicated to Max Euwe.',
   'Max Euweplein 30a, Amsterdam', 4.8822, 52.3618, 'Check opening days', 0.85, 'approved'),
  -- Madrid
  ('madrid', 'Retiro Park chess corner', 'park',
   'Weekend chess gatherings at the tables in Parque del Retiro, a Madrid institution.',
   'Parque del Retiro, Madrid', -3.6840, 40.4150, 'Busiest weekend mornings', 0.85, 'approved'),
  -- Zurich
  ('zurich', 'Lindenhof giant chess', 'park',
   'Outdoor giant chess boards on the Lindenhof hill over the old town, running for decades.',
   'Lindenhof, Zurich', 8.5406, 47.3730, 'Daylight hours', 0.9, 'approved'),
  ('zurich', 'Schachgesellschaft Zurich', 'club',
   'Founded 1809, widely considered the oldest chess club in the world.',
   'Zurich', 8.5417, 47.3769, 'Club nights weekly', 0.8, 'approved'),
  -- Stockholm
  ('stockholm', 'Kungstradgarden outdoor chess', 'park',
   'Large outdoor boards in Kungstradgarden in the warmer months, open to all.',
   'Kungstradgarden, Stockholm', 18.0710, 59.3310, 'Spring to autumn, daylight', 0.85, 'approved'),
  -- Berlin
  ('berlin', 'SC Kreuzberg', 'club',
   'Berlin''s best known chess club, strong teams and open club evenings.',
   'Kreuzberg, Berlin', 13.4050, 52.4990, 'Club nights weekly', 0.7, 'approved'),
  -- Hamburg
  ('hamburg', 'Hamburger Schachklub von 1830', 'club',
   'One of the oldest chess clubs in the world, founded 1830.',
   'Hamburg', 9.9937, 53.5611, 'Club nights weekly', 0.7, 'pending'),
  -- Munich
  ('munich', 'Munchener Schachclub 1836', 'club',
   'Historic Munich club dating to 1836.',
   'Munich', 11.5750, 48.1400, null, 0.6, 'pending'),
  -- Vienna
  ('vienna', 'Rathauspark chess', 'park',
   'Outdoor chess by the Rathaus in summer.',
   'Rathauspark, Vienna', 16.3580, 48.2110, 'Summer, daylight', 0.5, 'pending'),
  -- Milan
  ('milan', 'Societa Scacchistica Milanese', 'club',
   'Historic Milan chess society, one of Italy''s oldest.',
   'Milan', 9.1900, 45.4700, null, 0.65, 'pending'),
  -- Dublin
  ('dublin', 'Dublin Chess Club', 'club',
   'Founded 1867, among the oldest continuously running clubs anywhere.',
   'Dublin', -6.2600, 53.3440, 'Club nights weekly', 0.65, 'pending'),
  -- Prague
  ('prague', 'Prague castle-side outdoor chess', 'park',
   'Casual outdoor boards reported around Letna and the old town in season.',
   'Prague', 14.4200, 50.0930, null, 0.4, 'pending'),
  -- Copenhagen
  ('copenhagen', 'Kobenhavns Skakforening', 'club',
   'The main Copenhagen chess association with regular play.',
   'Copenhagen', 12.5680, 55.6800, null, 0.55, 'pending'),
  -- Barcelona
  ('barcelona', 'Ciutadella park chess', 'park',
   'Casual weekend chess reported in Parc de la Ciutadella.',
   'Parc de la Ciutadella, Barcelona', 2.1870, 41.3880, 'Weekends', 0.45, 'pending'),
  -- Warsaw
  ('warsaw', 'Lazienki Park chess', 'park',
   'Summer chess tables in Lazienki Park.',
   'Lazienki Park, Warsaw', 21.0350, 52.2150, 'Summer', 0.45, 'pending')
) as v(city_slug, name, kind, description, address, lng, lat, opening_notes, confidence, status)
join cities c on c.slug = v.city_slug
where not exists (
  select 1 from places p
  where p.city_id = c.id and lower(p.name) = lower(v.name)
);

-- 3) Europe-first automatic scraping: the daily cron takes priority cities
-- (never-scraped first). Top European cities by population plus chess-notable.
update cities set scrape_priority = 100 where slug in (
  'london','berlin','madrid','rome','milan','barcelona','naples','vienna',
  'hamburg','munich','warsaw','budapest','prague','brussels','stockholm',
  'copenhagen','dublin','lisbon','athens','amsterdam','zurich','istanbul',
  'manchester','birmingham','paris','kyiv','saint-petersburg','moscow'
);

select 'europe seed loaded' as status,
  (select count(*) from places where source = 'import') as knowledge_places,
  (select count(*) from cities where scrape_priority > 0) as priority_cities;
