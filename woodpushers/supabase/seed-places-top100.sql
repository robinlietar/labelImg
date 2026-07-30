-- Top-100 world cities: guarantee at least one place in each, from knowledge.
-- Inserts ONLY into cities that currently have zero places, so re-running or
-- overlapping with other seeds is safe. Coordinates are near-venue estimates:
-- Google enrichment snaps approved places to exact pins on the next pass.
-- Cities not covered here get scrape_priority 80 below, so the nightly cron
-- (OSM + Claude research + Google discovery) fills them first.

with v (name, kind, description, lat, lng, website, confidence, status, city_slug) as (
  values
  ('Tokyo Chess Centre', 'club', 'International chess hub run by the National Chess Society of Japan, in Yotsuya.', 35.6864, 139.7223, 'https://chess-japan.jp', 0.75, 'approved', 'tokyo'),
  ('Shanghai Qiyuan', 'club', 'The Shanghai Chess Institute on Nanjing Road West, home to chess, weiqi and xiangqi programs.', 31.2286, 121.4590, null, 0.75, 'approved', 'shanghai'),
  ('China Qiyuan', 'club', 'National board games academy hosting the Chinese chess federation programs.', 39.8823, 116.4189, null, 0.7, 'pending', 'beijing'),
  ('Clube de Xadrez Sao Paulo', 'club', 'Traditional downtown chess club near Republica.', -23.5432, -46.6420, null, 0.7, 'pending', 'sao-paulo'),
  ('Plaza de la Ciudadela chess corner', 'park', 'The Ciudadela park is Mexico City''s open-air board games spot, chess and dominoes daily.', 19.4300, -99.1470, null, 0.75, 'approved', 'mexico-city'),
  ('Club Argentino de Ajedrez', 'club', 'Historic Buenos Aires club in Recoleta where Alekhine, Capablanca and Fischer all played.', -34.5960, -58.3940, 'https://www.clubargentinodeajedrez.com.ar', 0.9, 'approved', 'buenos-aires'),
  ('Alekhine Chess Club', 'club', 'Kolkata institution at Gorky Sadan, cradle of Indian chess.', 22.5390, 88.3530, null, 0.85, 'approved', 'kolkata'),
  ('Rizal Park Chess Plaza', 'park', 'Manila''s famous open-air chess plaza in Luneta, boards busy from morning to night.', 14.5820, 120.9770, null, 0.85, 'approved', 'manila'),
  ('Clube de Xadrez Guanabara', 'club', 'Rio de Janeiro''s leading chess club, host of strong opens.', -22.9100, -43.1800, null, 0.8, 'approved', 'rio-de-janeiro'),
  ('Central Chess Club', 'club', 'The Central House of Chess on Gogolevsky Boulevard, the most storied club in Russia.', 55.7460, 37.5990, null, 0.9, 'approved', 'moscow'),
  ('Los Angeles Chess Club', 'club', 'Active West LA club with regular rated events.', 34.0330, -118.4400, 'https://www.lachessclub.com', 0.8, 'approved', 'los-angeles'),
  ('Tal Chess Club', 'club', 'Chennai club at the Russian Cultural Centre that shaped generations of Indian grandmasters.', 13.0430, 80.2500, null, 0.8, 'approved', 'chennai'),
  ('Parque Santander chess tables', 'park', 'Bogota''s downtown square where street chess runs all day.', 4.6010, -74.0720, null, 0.7, 'pending', 'bogota'),
  ('Bangkok Chess Club', 'club', 'Long-running expat and local club meeting weekly in the Silom area.', 13.7270, 100.5270, 'https://www.bangkokchess.com', 0.7, 'pending', 'bangkok'),
  ('Tehran Chess House', 'club', 'The city chess house of one of the world''s fastest-growing chess nations.', 35.7200, 51.4200, null, 0.7, 'pending', 'tehran'),
  ('Chess Pavilion at North Avenue Beach', 'park', 'Chicago''s lakefront chess landmark, outdoor boards with skyline views.', 41.9120, -87.6260, null, 0.85, 'approved', 'chicago'),
  ('Dato'' Arthur Tan Chess Centre', 'club', 'Kuala Lumpur''s DATCC, the hub of Malaysian chess.', 3.1660, 101.6970, null, 0.85, 'approved', 'kuala-lumpur'),
  ('Dallas Chess Club', 'club', 'One of the strongest club scenes in Texas, with weekly rated play.', 32.9600, -96.7100, 'https://dallaschess.com', 0.85, 'approved', 'dallas'),
  ('Hong Kong Chess Club', 'club', 'The city''s international chess club, meeting in Wan Chai.', 22.2780, 114.1720, null, 0.7, 'pending', 'hong-kong'),
  ('Dupont Circle chess tables', 'park', 'Washington''s famous outdoor stone boards, blitz at all hours.', 38.9090, -77.0430, null, 0.85, 'approved', 'washington'),
  ('Plaza de Armas chess corner', 'park', 'Santiago''s central square, ringed by daily open-air chess crowds.', -33.4372, -70.6506, null, 0.85, 'approved', 'santiago'),
  ('Annex Chess Club', 'club', 'Toronto''s big weekly club night in the Annex.', 43.6620, -79.4100, 'https://annexchessclub.com', 0.8, 'approved', 'toronto'),
  ('Franklin Mercantile Chess Club', 'club', 'Philadelphia''s historic downtown chess club.', 39.9500, -75.1700, null, 0.8, 'approved', 'philadelphia'),
  ('Johannesburg Chess Club', 'club', 'One of South Africa''s oldest clubs, active league play.', -26.2000, 28.0400, null, 0.7, 'pending', 'johannesburg'),
  ('Singapore Chess Federation', 'club', 'National federation clubhouse in Bishan with open play and training.', 1.3470, 103.8500, 'https://singaporechess.org.sg', 0.85, 'approved', 'singapore'),
  ('Chigorin Chess Club', 'club', 'Saint Petersburg''s central chess club on Bolshaya Konyushennaya.', 59.9390, 30.3230, null, 0.85, 'approved', 'saint-petersburg'),
  ('Melbourne Chess Club', 'club', 'Founded 1866 in Fitzroy, the oldest chess club in the southern hemisphere.', -37.8000, 144.9700, 'https://melbournechessclub.org', 0.9, 'approved', 'melbourne'),
  ('Boylston Chess Club', 'club', 'Boston''s historic club, now hosting weekly events in Somerville.', 42.3900, -71.1000, 'https://boylstonchess.org', 0.8, 'approved', 'boston'),
  ('Cape Town Chess Club', 'club', 'Founded 1885, the oldest chess club in South Africa.', -33.9300, 18.4200, 'https://capetownchessclub.co.za', 0.8, 'approved', 'cape-town'),
  ('Nairobi Chess Club', 'club', 'Kenya''s leading club with regular weekend tournaments.', -1.2860, 36.8200, null, 0.6, 'pending', 'nairobi'),
  ('Bangladesh Chess Federation', 'club', 'Federation hall near the National Sports Council, open play most days.', 23.7300, 90.4100, null, 0.6, 'pending', 'dhaka'),
  ('Lagos Chess Club', 'club', 'Club scene around the National Stadium sports halls in Surulere.', 6.5000, 3.3600, null, 0.6, 'pending', 'lagos'),
  ('Karnataka State Chess Association', 'club', 'Bangalore''s state association hall with open play and events.', 12.9800, 77.5900, null, 0.6, 'pending', 'bangalore'),
  ('Delhi Chess Association', 'club', 'The capital''s chess association, hub for Delhi tournament play.', 28.6800, 77.2200, null, 0.55, 'pending', 'delhi'),
  ('Tao Dan Park chess corner', 'park', 'Ho Chi Minh City park with a daily board games crowd, chess alongside xiangqi.', 10.7740, 106.6920, null, 0.55, 'pending', 'ho-chi-minh-city'),
  ('Kadikoy chess scene', 'club', 'Istanbul''s Anatolian-side chess hotspot, clubs and cafes around Kadikoy.', 40.9900, 29.0300, null, 0.5, 'pending', 'istanbul'),
  ('Seoul Chess Club', 'club', 'International club meeting around Itaewon for casual and rated play.', 37.5340, 126.9940, null, 0.55, 'pending', 'seoul'),
  ('Turkish Chess Federation Ankara', 'club', 'The federation''s Ankara headquarters, with training halls.', 39.9200, 32.8500, 'https://www.tsf.org.tr', 0.6, 'pending', 'ankara'),
  ('Parque Kennedy chess corner', 'park', 'Miraflores'' park chess crowd in Lima, most active in the evening.', -12.1210, -77.0300, null, 0.55, 'pending', 'lima'),
  ('Houston Chess Studio', 'club', 'Dedicated chess venue with classes and casual play.', 29.7400, -95.4600, null, 0.6, 'pending', 'houston')
)
insert into places (name, kind, description, city_id, location, website, source, confidence, status)
select v.name, v.kind, v.description, c.id,
       st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
       v.website, 'import', v.confidence, v.status
from v
join cities c on c.slug = v.city_slug
where not exists (select 1 from places p where p.city_id = c.id);

-- Cities in the world top 100 still without any place: scrape them first.
with top100 as (
  select id from cities order by population desc nulls last limit 100
)
update cities set scrape_priority = greatest(scrape_priority, 80)
where id in (select id from top100)
  and not exists (select 1 from places p where p.city_id = cities.id);

select 'top100 seed loaded' as status,
  (select count(distinct city_id) from places) as cities_with_places,
  (select count(*) from cities where scrape_priority >= 80) as boosted_cities;
