-- Scraper support RPCs. Called with the service role from the pipeline.

-- Next cities to scrape: never-scraped first (biggest population first),
-- then the oldest last_scraped_at. Coordinates extracted for the sources.
create or replace function next_cities_to_scrape(max_count int)
returns table (
  id bigint, name text, country_code text, slug text,
  population bigint, lng double precision, lat double precision
)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug, c.population,
         st_x(c.location::geometry) as lng,
         st_y(c.location::geometry) as lat
  from cities c
  order by c.last_scraped_at asc nulls first,
           c.population desc nulls last
  limit max_count;
$$;

-- Named cities (for manual runs like --city sydney --city paris).
create or replace function cities_by_slugs(slugs text[])
returns table (
  id bigint, name text, country_code text, slug text,
  population bigint, lng double precision, lat double precision
)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug, c.population,
         st_x(c.location::geometry) as lng,
         st_y(c.location::geometry) as lat
  from cities c
  where c.slug = any(slugs);
$$;

-- Existing places in a city (any status) for dedupe.
create or replace function places_for_dedupe(p_city_id bigint)
returns table (name text, website text, lng double precision, lat double precision)
language sql stable as $$
  select p.name, p.website,
         st_x(p.location::geometry) as lng,
         st_y(p.location::geometry) as lat
  from places p
  where p.city_id = p_city_id;
$$;

-- Insert a discovered place with a lng/lat, returning the new id.
create or replace function insert_scraped_place(
  p_name text, p_kind text, p_description text, p_address text,
  p_city_id bigint, p_lng double precision, p_lat double precision,
  p_website text, p_opening_notes text, p_source text, p_source_url text,
  p_confidence numeric, p_status text
)
returns uuid
language plpgsql as $$
declare new_id uuid;
begin
  insert into places (
    name, kind, description, address, city_id, location, website,
    opening_notes, source, source_url, confidence, status
  ) values (
    p_name, p_kind, p_description, p_address, p_city_id,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_website, p_opening_notes, p_source, p_source_url, p_confidence, p_status
  ) returning id into new_id;
  return new_id;
end;
$$;

-- Mark a city scraped.
create or replace function mark_city_scraped(p_city_id bigint)
returns void language sql as $$
  update cities set last_scraped_at = now() where id = p_city_id;
$$;

-- Upsert a seed city by slug.
create or replace function upsert_city(
  p_name text, p_country_code text, p_slug text,
  p_population bigint, p_lng double precision, p_lat double precision
)
returns void language plpgsql as $$
begin
  insert into cities (name, country_code, slug, population, location)
  values (
    p_name, p_country_code, p_slug, p_population,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  )
  on conflict (slug) do update
    set population = excluded.population,
        location = excluded.location,
        name = excluded.name,
        country_code = excluded.country_code;
end;
$$;
