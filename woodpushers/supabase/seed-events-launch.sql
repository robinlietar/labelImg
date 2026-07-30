-- Live-scraped chess events for the launch cities (test of the events
-- pipeline, generated 2026-07-30). Requires migration 0022.
-- Re-runnable: upserts per (city, title) and links venues by name.

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Blitz Society – St Germain') limit 1),
  'Blitz Society – Regular Blitz Competitions & Themed Evenings', 'Ongoing blitz tournaments and themed chess nights at Blitz Society St Germain; check website for the rolling programme.',
  null, 'Multiple times per week (see blitzsociety.fr/en for schedule)', 'https://www.blitzsociety.fr/en'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Blitz Society – St Germain') limit 1),
  'Blitz Society – Saturday Blitz Boot Camp', 'Weekly morning blitz boot camp to fix recurring weaknesses in your game; free-play format with coaching.',
  null, 'Every Saturday 10:00–12:00', 'https://www.blitzsociety.fr/en/search'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Blitz Society – St Germain') limit 1),
  'Blitz Society – Chess Classes with FM Vincent Riff', 'Weekly group lessons for children and adults with International Federation Master Vincent Riff.',
  null, 'Every Tuesday', 'https://www.blitzsociety.fr/en'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Au Petit Balcon / rotating venue, 75020 Paris') limit 1),
  'Chess by Zenmind – Monthly All-Levels Chess Meetup', 'Casual chess meetup in a bar/restaurant in the 20th arrondissement; free-play boards plus optional blitz tournament (5 min+2 sec); all levels welcome.',
  null, 'Monthly on Tuesday evenings at 19:00 (see Meetup for next edition)', 'https://www.meetup.com/chess-by-zenmind-chess-in-paris/'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Tour Blanche Échecs, 38 rue des Amandiers, 75020 Paris') limit 1),
  'Tour Blanche – Regular Club Nights', 'Open club nights at Tour Blanche Échecs for members and guests; blitz, rapid and training sessions throughout the year.',
  null, 'Monday & Wednesday 19:30–22:30, Saturday 15:00–19:00', 'https://www.tourblanche.asso.fr/'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Mairie du 20e arrondissement, Paris') limit 1),
  'Festival du Mat – Tour Blanche Annual Rapid Tournament', 'One of France''s three largest rapid-chess festivals, held each year at the Mairie du 20e; open to all levels.',
  null, 'Annually in early October', 'https://www.tourblanche.asso.fr/'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('12 rue Benjamin Franklin, 75016 Paris') limit 1),
  'Championnats Scolaires de Paris – Écoles Élémentaires', 'Official Paris youth school chess championship for primary-school players, organised by CDPE 75.',
  '2025-11-19T00:00:00.000Z', null, 'https://www.cdpe75.fr/'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Halle Carpentier, 75013 Paris') limit 1),
  'Qualifications Départementales Parisiennes Jeunes', 'Annual Paris youth departmental qualification tournament; 608 players participated in the 2025 edition at Halle Carpentier.',
  '2025-11-11T00:00:00.000Z', null, 'https://www.cdpe75.fr/'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Various venues, Paris') limit 1),
  'Tournois officiels FFE – Paris (liste CDPE 75)', 'Rolling list of all FIDE-rated and FFE-rated OTB tournaments held in Paris; updated continuously by the French Chess Federation.',
  null, 'Year-round – see FFE listing', 'https://www.echecs.asso.fr/ListeTournois.aspx?Action=TOURNOICOMITE&ComiteRef=75'
from cities c where c.slug = 'paris'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Norths Chess Club, 12 Abbott St, Cammeray') limit 1),
  'Norths Chess Club – Weekly Tuesday Night Chess', 'All-levels club night at Norths Leagues Club; blitz, rapid and classical tournaments run throughout the season.',
  null, 'Every Tuesday 19:30', 'https://www.northsydneychess.org/'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Wenty Leagues, 50 Smith St, Wentworthville') limit 1),
  'Rooty Hill Chess Club – Weekly Monday Night Chess', 'FIDE and ACF rated weekly OTB play at Wenty Leagues; all ages and levels welcome.',
  null, 'Every Monday 18:30', 'https://www.rootyhillchessclub.org/contact-us/'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Sydney Academy of Chess venue, Greater Sydney') limit 1),
  'Sydney Chess Club – Monday Night Casual & Tournaments', 'Weekly Monday sessions alternating between casual social play and ACF/FIDE-rated rapid or blitz tournaments; membership required for rated events.',
  null, 'Every Monday (see calendar for casual vs rated)', 'https://sydneyacademyofchess.com.au/sydney-chess-club-calendar-2025'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Paragon Hotel, Sydney') limit 1),
  'Check Mates – Sydney Social Chess Club Meetup', 'Friendly competitive-social chess night at the Paragon Hotel; workshops, tutoring and casual mixed games; free tea and coffee for members.',
  null, 'Every Monday ~18:00–21:00', 'https://www.meetup.com/check-mates-sydney-social-chess-club/'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Sydney Chess Club venue') limit 1),
  'Sydney Chess Club – August Blitz ACF Quick Rated Tournament', 'Monthly ACF Quick Rated Blitz tournament open to Sydney Chess Club members; prizes for top finishers and best under 1600.',
  '2025-08-25T00:00:00.000Z', null, 'https://sydneyacademyofchess.com.au/sydney-chess-club-calendar-2025'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Sydney Chess Club venue') limit 1),
  'Sydney Chess Club – August Fun Blitz (Not Rated, Free Entry)', 'Informal free-entry blitz tournament night at the Sydney Chess Club; no rating implications, great for all levels.',
  '2025-08-18T00:00:00.000Z', null, 'https://sydneyacademyofchess.com.au/sydney-chess-club-calendar-2025'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Sydney Chess Club venue') limit 1),
  'Sydney Chess Club – September Blitz ACF Quick Rated Tournament', 'ACF Quick Rated Blitz event run by Sydney Chess Club; prize money for top places and best unrated.',
  '2025-09-22T00:00:00.000Z', null, 'https://sydneyacademyofchess.com.au/sydney-chess-club-calendar-2025'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Norths Leagues Club, 12 Abbott St, Cammeray') limit 1),
  'Norths Chess Club – 2025 NSW State Championship (IM Norm Event)', 'A prestige rated championship event hosted by Norths Chess Club, designated as an IM Norm event for eligible players.',
  null, null, 'https://www.northsydneychess.org/dbpage.php?pg=news'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Ultimo Community Centre, 40 William Henry St, Ultimo') limit 1),
  'Ultimo Community Centre – Free Chess Social Play', 'Drop-in free chess board hire at the City of Sydney''s Ultimo Community Centre; no booking needed, all welcome.',
  null, 'Weekdays 10:00–20:00, Weekends 10:00–16:00', 'https://whatson.cityofsydney.nsw.gov.au/events/chess-social-play'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
select c.id,
  (select p.id from places p where p.city_id = c.id
     and lower(p.name) = lower('Sydney (NSWJCL venue)') limit 1),
  'NSWJCL Sydney Winter Fun Tournaments', 'Junior-focused OTB Swiss-system fun tournaments for all levels; intended for players not yet ready for serious classical time controls.',
  '2025-07-11T00:00:00.000Z', null, 'https://www.nswjcl.org.au/ComingEvents/2025/Winter/SydneyWinterTournaments.htm'
from cities c where c.slug = 'sydney'
on conflict (city_id, lower(title)) do update
  set description = coalesce(excluded.description, events.description),
      starts_at = coalesce(excluded.starts_at, events.starts_at),
      recurrence = coalesce(excluded.recurrence, events.recurrence),
      place_id = coalesce(excluded.place_id, events.place_id),
      source_url = coalesce(excluded.source_url, events.source_url),
      updated_at = now();

select 'events seeded' as status, count(*) as events_total from events;
