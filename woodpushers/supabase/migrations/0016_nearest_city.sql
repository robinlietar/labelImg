-- Nearest city to a point, for the "use my location" home-city picker.
create or replace function nearest_city(p_lng double precision, p_lat double precision)
returns table (id bigint, name text, country_code text, slug text)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug
  from cities c
  order by c.location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit 1;
$$;
grant execute on function nearest_city(double precision, double precision) to anon, authenticated;
