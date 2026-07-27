-- Wave 3 knowledge seed: broader coverage, generous on inclusion since the
-- owner reviews from admin. Confident rows are approved, the rest pending.
-- Skips cities not present and places already seeded. Safe to re-run.

insert into places (name, kind, description, address, city_id, location, website, opening_notes, source, source_url, confidence, status)
select v.name, v.kind, v.description, v.address,
       c.id,
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       null, v.opening_notes, 'import', null, v.confidence, v.status
from (values
  -- Sydney depth
  ('sydney', 'North Sydney Leagues Club chess night', 'club', 'Casual midweek chess alongside the Norths club scene.', 'Cammeray NSW', 151.2115, -33.8225, 'Midweek evenings', 0.5, 'pending'),
  ('sydney', 'Cabra-Vale Diggers Chess Club', 'club', 'South-west Sydney club with rated events.', 'Canley Vale NSW', 150.9650, -33.8880, 'Weekly club night', 0.55, 'pending'),
  ('sydney', 'Hornsby RSL chess', 'club', 'Upper north shore club night.', 'Hornsby NSW', 151.0990, -33.7040, 'Weekly', 0.5, 'pending'),
  ('sydney', 'The Chess Shop Sydney', 'shop', 'Specialist chess retailer, casual boards welcome.', 'Sydney CBD NSW', 151.2065, -33.8730, 'Business hours', 0.45, 'pending'),
  -- Paris depth
  ('paris', 'Echiquier du Marais', 'club', 'Neighborhood club in the Marais with weekly evenings.', '75004 Paris', 2.3560, 48.8570, 'Weekly evenings', 0.5, 'pending'),
  ('paris', 'Tour Blanche Paris', 'club', 'Club with youth and adult sections.', 'Paris', 2.3400, 48.8700, null, 0.45, 'pending'),
  ('paris', 'Parc Montsouris chess tables', 'park', 'Southern Paris park tables, weekend play.', 'Parc Montsouris, 75014 Paris', 2.3380, 48.8220, 'Weekends', 0.5, 'pending'),
  ('paris', 'Canal Saint-Martin casual chess', 'park', 'Informal canalside games in fine weather.', 'Quai de Valmy, 75010 Paris', 2.3660, 48.8720, 'Fine weather', 0.4, 'pending'),
  -- Berlin depth
  ('berlin', 'Schachcafe am Boxhagener Platz', 'cafe', 'Cafe chess reported around Boxhagener Platz.', 'Friedrichshain, Berlin', 13.4590, 52.5100, null, 0.4, 'pending'),
  ('berlin', 'Berliner Schachverband open evenings', 'club', 'Federation-hosted open evenings at various halls.', 'Berlin', 13.4000, 52.5100, null, 0.5, 'pending'),
  -- More Europe
  ('rome', 'Villa Borghese chess gatherings', 'park', 'Casual games near the Pincio terrace.', 'Villa Borghese, Rome', 12.4790, 41.9110, 'Weekends', 0.4, 'pending'),
  ('lisbon', 'Grupo de Xadrez de Lisboa', 'club', 'Historic Lisbon chess group.', 'Lisbon', -9.1450, 38.7250, null, 0.5, 'pending'),
  ('athens', 'Zappeion gardens chess', 'park', 'Outdoor games by the Zappeion in season.', 'Athens', 23.7360, 37.9710, 'Evenings in season', 0.4, 'pending'),
  ('brussels', 'Cercle Royal des Echecs de Bruxelles', 'club', 'The royal Brussels chess circle, one of Belgium''s oldest.', 'Brussels', 4.3600, 50.8450, 'Club nights', 0.6, 'pending'),
  ('budapest', 'Erzsebet ter chess corner', 'park', 'Downtown outdoor boards in season.', 'Budapest', 19.0520, 47.4980, 'Season, daylight', 0.4, 'pending'),
  ('vienna', 'Wiener Schachakademie', 'club', 'Vienna chess academy with open play nights.', 'Vienna', 16.3600, 48.2050, null, 0.45, 'pending'),
  ('oslo', 'Oslo Schakselskap', 'club', 'Norway''s premier club, founded 1884, Magnus country.', 'Oslo', 10.7400, 59.9200, 'Club nights', 0.65, 'pending'),
  ('helsinki', 'Esplanadi park chess', 'park', 'Summer boards on the Esplanadi.', 'Helsinki', 24.9470, 60.1670, 'Summer', 0.45, 'pending'),
  ('manchester', '3 Rifles / Manchester Chess Federation nights', 'club', 'Active league scene across the city.', 'Manchester', -2.2400, 53.4800, 'League nights', 0.45, 'pending'),
  ('edinburgh', 'Edinburgh Chess Club', 'club', 'Founded 1822, one of the oldest clubs in the world, Alva Street rooms.', '1 Alva St, Edinburgh', -3.2120, 55.9510, 'Club nights', 0.75, 'approved'),
  ('glasgow', 'Glasgow Chess Club', 'club', 'Long-running city club.', 'Glasgow', -4.2600, 55.8600, null, 0.5, 'pending'),
  ('dublin', 'Phoenix Park casual chess', 'park', 'Informal weekend games reported.', 'Dublin', -6.3300, 53.3560, 'Weekends', 0.35, 'pending'),
  -- Americas
  ('boston', 'Boylston Chess Club', 'club', 'Historic Boston club with weekly tournaments.', 'Cambridge MA', -71.1030, 42.3660, 'Weekly events', 0.75, 'approved'),
  ('boston', 'Harvard Square chess tables', 'park', 'The famous outdoor tables by Au Bon Pain, Cambridge institution.', 'Harvard Square, Cambridge MA', -71.1190, 42.3730, 'Daily', 0.7, 'approved'),
  ('philadelphia', 'Rittenhouse Square chess', 'park', 'Park regulars most fine days.', 'Philadelphia PA', -75.1720, 39.9490, 'Daily in daylight', 0.55, 'pending'),
  ('seattle', 'Seattle Chess Club', 'club', 'Northwest hub with regular rated play.', 'Seattle WA', -122.3200, 47.6600, 'Weekly', 0.6, 'pending'),
  ('chicago', 'Chicago Chess Club', 'club', 'Downtown club with classes and blitz nights.', 'Chicago IL', -87.6300, 41.8800, null, 0.5, 'pending'),
  ('vancouver', 'Vancouver Chess Club', 'club', 'Active club scene.', 'Vancouver BC', -123.1100, 49.2600, null, 0.5, 'pending'),
  ('montreal', 'Club d''echecs de Montreal', 'club', 'The main Montreal club.', 'Montreal QC', -73.5700, 45.5100, null, 0.5, 'pending'),
  ('sao-paulo', 'Clube de Xadrez Sao Paulo', 'club', 'The city''s central chess club.', 'Sao Paulo', -46.6500, -23.5500, null, 0.5, 'pending'),
  ('rio-de-janeiro', 'Praca Sao Salvador chess', 'park', 'Casual outdoor games, Laranjeiras.', 'Rio de Janeiro', -43.1850, -22.9330, 'Evenings', 0.4, 'pending'),
  ('mexico-city', 'Alameda Central chess', 'park', 'Long-running outdoor scene by the Alameda.', 'Mexico City', -99.1440, 19.4360, 'Daily', 0.5, 'pending'),
  -- Asia-Pacific
  ('melbourne', 'Melbourne Chess Club', 'club', 'Founded 1866, the oldest chess club in the southern hemisphere, Fitzroy rooms.', '66 Leicester St, Fitzroy VIC', 144.9780, -37.8010, 'Multiple nights weekly', 0.85, 'approved'),
  ('brisbane', 'Gardiner Chess centre', 'club', 'Queensland chess hub.', 'Brisbane QLD', 153.0300, -27.5000, null, 0.5, 'pending'),
  ('auckland', 'Auckland Chess Centre', 'club', 'New Zealand''s biggest club, Mt Eden.', 'Mt Eden, Auckland', 174.7580, -36.8800, 'Club nights weekly', 0.7, 'approved'),
  ('wellington', 'Wellington Chess Club', 'club', 'Capital club with long history.', 'Wellington', 174.7770, -41.2900, null, 0.55, 'pending'),
  ('seoul', 'Seoul Chess Club meetups', 'club', 'English-friendly meetup scene.', 'Seoul', 126.9800, 37.5600, 'Weekends', 0.45, 'pending'),
  ('bangkok', 'Bangkok Chess Club', 'club', 'Expat-founded club with weekly nights, hosts a famous open.', 'Bangkok', 100.5300, 13.7400, 'Weekly nights', 0.65, 'approved'),
  ('hanoi', 'Hoan Kiem lake chess', 'park', 'Morning xiangqi and chess by the lake.', 'Hanoi', 105.8520, 21.0290, 'Mornings', 0.45, 'pending'),
  ('manila', 'Rizal Park chess plaza', 'park', 'The famous open-air chess plaza in Luneta.', 'Rizal Park, Manila', 120.9790, 14.5820, 'Daily', 0.7, 'approved'),
  ('mumbai', 'Shivaji Park chess', 'park', 'Outdoor games at the park edges.', 'Mumbai', 72.8390, 19.0280, 'Evenings', 0.4, 'pending'),
  ('delhi', 'Delhi Chess Association hall', 'club', 'The DCA hall with regular events.', 'New Delhi', 77.2100, 28.6300, null, 0.5, 'pending'),
  ('chennai', 'Chennai chess academies cluster', 'club', 'The Indian chess capital, academies across the city.', 'Chennai', 80.2500, 13.0600, null, 0.5, 'pending'),
  -- Africa and Middle East
  ('cape-town', 'Cape Town Chess Club', 'club', 'Founded 1885, oldest club in South Africa.', 'Cape Town', 18.4200, -33.9300, 'Club nights', 0.7, 'approved'),
  ('nairobi', 'Nairobi Chess Club', 'club', 'Kenya''s main club with weekend play.', 'Nairobi', 36.8200, -1.2900, 'Weekends', 0.55, 'pending'),
  ('cairo', 'Al-Azhar park chess gatherings', 'park', 'Casual games reported.', 'Cairo', 31.2620, 30.0400, null, 0.35, 'pending'),
  ('dubai', 'Dubai Chess and Culture Club', 'club', 'Purpose-built chess club, hosts internationals.', 'Dubai', 55.3300, 25.2600, 'Most days', 0.8, 'approved'),
  ('tel-aviv', 'Rothschild Boulevard chess kiosk', 'park', 'Boulevard chess tables, an institution.', 'Tel Aviv', 34.7750, 32.0630, 'Daily', 0.6, 'pending')
) as v(city_slug, name, kind, description, address, lng, lat, opening_notes, confidence, status)
join cities c on c.slug = v.city_slug
where not exists (
  select 1 from places p
  where p.city_id = c.id and lower(p.name) = lower(v.name)
);

select 'wave 3 loaded' as status,
  (select count(*) from places where source = 'import') as knowledge_places_total,
  (select count(*) from places where status = 'approved') as live_on_map;
