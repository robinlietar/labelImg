-- Submission and city-page support. Idempotent.

-- Nearest approved places to a point, for dedupe context in assessment.
create or replace function nearest_places(
  p_lng double precision, p_lat double precision, p_limit int default 5
)
returns table (
  id uuid, name text, kind text, address text,
  lng double precision, lat double precision, distance_m double precision
)
language sql stable as $$
  select p.id, p.name, p.kind, p.address,
         st_x(p.location::geometry), st_y(p.location::geometry),
         st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  from places p
  where p.status = 'approved'
  order by p.location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit p_limit;
$$;

-- Find the city whose centroid is closest to a point (to attach a place).
create or replace function nearest_city_id(
  p_lng double precision, p_lat double precision
)
returns bigint
language sql stable as $$
  select c.id from cities c
  order by c.location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit 1;
$$;

-- City page stats: count of visible, recently-active players in the city.
create or replace function city_active_players(city_slug text)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from profiles p
  join cities c on c.id = p.home_city_id
  where c.slug = city_slug
    and p.visible = true
    and p.last_seen_at >= now() - interval '30 days';
$$;

grant execute on function nearest_places(double precision, double precision, int) to authenticated, service_role;
grant execute on function nearest_city_id(double precision, double precision) to service_role;
grant execute on function city_active_players(text) to anon, authenticated;
