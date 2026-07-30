-- Casual chess wave: bars, cafes, park scenes and social spots, from
-- knowledge. These are famous, long-running casual scenes rather than
-- federation clubs. Deduped per (city, name); safe to re-run. Approximate
-- coordinates are snapped to exact pins by Google enrichment.

with v (name, kind, description, lat, lng, website, confidence, status, city_slug) as (
  values
  ('Jardin du Luxembourg chess corner', 'park', 'The Paris chess institution: dozens of boards under the trees near the tennis courts, every afternoon.', 48.8470, 2.3372, null, 0.9, 'approved', 'paris'),
  ('Le Petit Ney', 'cafe', 'Associative cafe in the 18th with a long-running chess night, friendly level.', 48.8987, 2.3390, null, 0.65, 'pending', 'paris'),
  ('Chess Forum', 'shop', 'Greenwich Village chess shop where anyone can sit and play at all hours, a New York classic.', 40.7295, -74.0004, 'https://www.chessforum.com', 0.9, 'approved', 'new-york'),
  ('Bryant Park games area', 'park', 'Midtown Manhattan park with a dedicated games area, chess sets to borrow.', 40.7536, -73.9832, null, 0.85, 'approved', 'new-york'),
  ('Union Square chess hustlers', 'park', 'Fast blitz for a few dollars a game with the legendary Union Square regulars.', 40.7359, -73.9911, null, 0.8, 'approved', 'new-york'),
  ('Max Euweplein giant chess', 'park', 'Amsterdam''s giant outdoor board on the square named after the Dutch world champion, always a crowd.', 52.3620, 4.8829, null, 0.9, 'approved', 'amsterdam'),
  ('Schaakcafe De Laurierboom', 'bar', 'Amsterdam''s brown cafe dedicated to chess in the Jordaan, boards on every table.', 52.3712, 4.8790, null, 0.8, 'approved', 'amsterdam'),
  ('Hyde Park giant chessboard', 'park', 'Sydney''s outdoor giant chess near the Archibald Fountain, lunchtime crowds on weekdays.', -33.8724, 151.2114, null, 0.9, 'approved', 'sydney'),
  ('Szechenyi Baths chess', 'other', 'Budapest''s famous sight: locals playing chess in the thermal water on floating boards.', 47.5186, 19.0773, null, 0.85, 'approved', 'budapest'),
  ('Lindenhof giant chess', 'park', 'Zurich''s hilltop square with giant boards and regulars, views over the old town.', 47.3730, 8.5406, null, 0.9, 'approved', 'zurich'),
  ('Kungstradgarden giant chess', 'park', 'Central Stockholm park with a giant board played all day in season.', 59.3308, 18.0716, null, 0.85, 'approved', 'stockholm'),
  ('Parc des Bastions giant chess', 'park', 'Geneva''s famous giant boards by the Reformation Wall, a city symbol.', 46.1994, 6.1449, null, 0.9, 'approved', 'geneva'),
  ('Kalemegdan chess tables', 'park', 'Belgrade fortress park with rows of concrete chess tables and a serious daily scene.', 44.8226, 20.4500, null, 0.85, 'approved', 'belgrade'),
  ('Trg Oslobodjenja giant chess', 'park', 'Sarajevo''s Liberation Square, where the giant chess crowd is a city institution.', 43.8577, 18.4257, null, 0.9, 'approved', 'sarajevo'),
  ('Shevchenko Park chess', 'park', 'Kyiv''s classic outdoor chess spot opposite the university, strong veterans daily.', 50.4419, 30.5129, null, 0.85, 'approved', 'kyiv'),
  ('Retiro park chess corner', 'park', 'Madrid''s Sunday chess gathering in El Retiro near the lake.', 40.4153, -3.6845, null, 0.7, 'pending', 'madrid'),
  ('Santa Monica International Chess Park', 'park', 'Ocean Front Walk chess plaza by the beach, blitz all day.', 34.0089, -118.4973, null, 0.85, 'approved', 'los-angeles'),
  ('Harvard Square chess tables', 'park', 'Cambridge''s sidewalk chess fixture outside Harvard Yard, all levels welcome.', 42.3732, -71.1190, null, 0.85, 'approved', 'boston'),
  ('Tigran Petrosian Chess House', 'club', 'Yerevan''s central chess house, the heart of the most chess-mad country on earth.', 40.1706, 44.5126, null, 0.85, 'approved', 'yerevan'),
  ('Domino Park', 'park', 'Little Havana''s Maximo Gomez Park, dominoes first but chess tables too.', 25.7654, -80.2196, null, 0.6, 'pending', 'miami')
)
insert into places (name, kind, description, city_id, location, website, source, confidence, status)
select v.name, v.kind, v.description, c.id,
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       v.website, 'import', v.confidence, v.status
from v
join cities c on c.slug = v.city_slug
where not exists (
  select 1 from places p
  where p.city_id = c.id and lower(p.name) = lower(v.name)
);

select 'casual seed loaded' as status,
  (select count(*) from places where source = 'import') as knowledge_places;
