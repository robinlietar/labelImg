-- World expansion pack: famous, well-documented chess venues outside Europe,
-- curated from editorial knowledge. Same rules as the Europe pack: confident
-- rows go live, uncertain ones land in the admin queue as pending. Skips any
-- city missing from the cities table and any place already present.

insert into places (name, kind, description, address, city_id, location, website, opening_notes, source, source_url, confidence, status)
select v.name, v.kind, v.description, v.address,
       c.id,
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       null, v.opening_notes, 'import', null, v.confidence, v.status
from (values
  -- New York: the most famous chess corner on Earth
  ('new-york', 'Washington Square Park chess tables', 'park',
   'The legendary hustler tables in the southwest corner. Bring a clock and a few dollars.',
   'Washington Square Park SW corner, New York NY', -73.9990, 40.7302, 'Daily in daylight', 0.95, 'approved'),
  ('new-york', 'Marshall Chess Club', 'club',
   'Historic members club since 1915, home of countless legends. Events open to visitors.',
   '23 W 10th St, New York NY', -73.9967, 40.7345, 'Check event calendar', 0.95, 'approved'),
  ('new-york', 'Chess Forum', 'shop',
   'Greenwich Village chess shop where anyone can sit and play.',
   '219 Thompson St, New York NY', -74.0003, 40.7288, 'Business hours', 0.85, 'approved'),
  ('new-york', 'Central Park Chess and Checkers House', 'park',
   'Dedicated chess pavilion mid-park, boards provided on weekends.',
   'Central Park, mid-park at 64th St, New York NY', -73.9754, 40.7690, 'Weekends and holidays', 0.85, 'approved'),
  -- San Francisco
  ('san-francisco', 'Mechanics'' Institute Chess Room', 'club',
   'The oldest chess club in the United States, running since 1854, in a beautiful downtown library.',
   '57 Post St, San Francisco CA', -122.4038, 37.7889, 'Weekdays and events', 0.9, 'approved'),
  -- Saint Louis
  ('saint-louis', 'Saint Louis Chess Club', 'club',
   'The powerhouse of American chess: world-class club and the World Chess Hall of Fame across the street.',
   '4657 Maryland Ave, Saint Louis MO', -90.2626, 38.6446, 'Open most days, see site', 0.95, 'approved'),
  -- Washington DC
  ('washington', 'Dupont Circle chess tables', 'park',
   'Stone chess tables with a decades-old regular scene.',
   'Dupont Circle, Washington DC', -77.0434, 38.9097, 'Daylight hours', 0.85, 'approved'),
  -- Los Angeles
  ('los-angeles', 'Santa Monica International Chess Park', 'park',
   'Beachside chess plaza on Ocean Front Walk with built-in boards.',
   'Ocean Front Walk, Santa Monica CA', -118.4960, 34.0090, 'Daily in daylight', 0.85, 'approved'),
  -- Chicago
  ('chicago', 'Chicago Chess Pavilion (North Avenue Beach)', 'park',
   'Lakefront chess pavilion, a summer institution.',
   'North Avenue Beach, Chicago IL', -87.6270, 41.9130, 'Warm months', 0.7, 'pending'),
  -- Toronto
  ('toronto', 'Yonge and Gould outdoor chess', 'park',
   'Downtown outdoor boards with daily regulars.',
   'Yonge St and Gould St, Toronto ON', -79.3790, 43.6570, 'Daily in daylight', 0.6, 'pending'),
  -- Buenos Aires
  ('buenos-aires', 'Club Argentino de Ajedrez', 'club',
   'Argentina''s historic chess club, founded 1905, hosted world championship games.',
   'Paraguay 1858, Buenos Aires', -58.3940, -34.5960, 'Evenings', 0.8, 'approved'),
  -- Havana
  ('havana', 'Parque Central chess gatherings', 'park',
   'Informal but constant chess scene in the park, a Cuban tradition.',
   'Parque Central, Havana', -82.3590, 23.1370, 'Daily', 0.6, 'pending'),
  -- Mexico City
  ('mexico-city', 'Parque Mexico chess tables', 'park',
   'Condesa park tables with weekend games.',
   'Parque Mexico, Condesa, Mexico City', -99.1720, 19.4110, 'Weekends', 0.5, 'pending'),
  -- Reykjavik
  ('reykjavik', 'Reykjavik Chess Club (Taflfelag Reykjavikur)', 'club',
   'The club at the heart of chess-mad Iceland.',
   'Reykjavik', -21.8950, 64.1350, 'Club nights', 0.7, 'pending'),
  -- Tel Aviv
  ('tel-aviv', 'Lasker Chess Club', 'club',
   'Tel Aviv''s central chess club, named for Emanuel Lasker.',
   'Tel Aviv', 34.7770, 32.0800, 'Evenings', 0.6, 'pending'),
  -- Mumbai
  ('mumbai', 'Bombay YMCA chess evenings', 'community_center',
   'Long-running casual chess evenings.',
   'Mumbai', 72.8300, 18.9400, null, 0.4, 'pending'),
  -- Singapore
  ('singapore', 'Singapore Chess Federation clubhouse', 'club',
   'The federation''s clubhouse with regular open play.',
   'Bishan, Singapore', 103.8500, 1.3520, 'Check federation site', 0.6, 'pending'),
  -- Tokyo
  ('tokyo', 'Tokyo Chess Centre', 'club',
   'The hub of western chess in Japan, regular tournaments and casual nights.',
   'Tokyo', 139.7000, 35.6900, 'Weekends', 0.55, 'pending'),
  -- Sydney extras (owner cities get depth)
  ('sydney', 'Chatswood Chess Club', 'club',
   'Active north-shore club with junior and open sections.',
   'Chatswood NSW', 151.1810, -33.7970, 'Weekly club night', 0.6, 'pending'),
  ('sydney', 'Cammeray Chess at Norths', 'club',
   'Casual nights alongside the main Norths club sessions.',
   'Cammeray NSW', 151.2110, -33.8220, null, 0.5, 'pending'),
  -- Paris extras
  ('paris', 'Jardin des Tuileries chess corner', 'park',
   'Casual boards near the Feuillants terrace in season.',
   'Jardin des Tuileries, 75001 Paris', 2.3270, 48.8640, 'Fine weather', 0.6, 'pending'),
  ('paris', 'Square des Batignolles chess', 'park',
   'Neighborhood chess tables in the 17th.',
   'Square des Batignolles, 75017 Paris', 2.3190, 48.8880, null, 0.5, 'pending')
) as v(city_slug, name, kind, description, address, lng, lat, opening_notes, confidence, status)
join cities c on c.slug = v.city_slug
where not exists (
  select 1 from places p
  where p.city_id = c.id and lower(p.name) = lower(v.name)
);

select 'world seed loaded' as status,
  (select count(*) from places where source = 'import') as knowledge_places_total;
