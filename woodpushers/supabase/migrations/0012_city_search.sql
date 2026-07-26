-- City search with coordinates, for the map search box. Idempotent.
create or replace function search_cities(q text, max_count int default 8)
returns table (
  id bigint, name text, country_code text, slug text, population bigint,
  lng double precision, lat double precision
)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug, c.population,
         st_x(c.location::geometry), st_y(c.location::geometry)
  from cities c
  where c.name ilike q || '%'
  order by c.population desc nulls last
  limit max_count;
$$;

grant execute on function search_cities(text, int) to anon, authenticated;
