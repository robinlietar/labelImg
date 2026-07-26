-- Profile enrichment (titles + meta), viewer-aware ranking, and flexible
-- location (home city or coarsened device location). Idempotent.

alter table profiles add column if not exists lichess_title text;
alter table profiles add column if not exists chesscom_title text;
alter table profiles add column if not exists lichess_meta jsonb;
alter table profiles add column if not exists chesscom_meta jsonb;

-- Set home city: recompute coarse location from the city centroid.
create or replace function set_home_city(p_city_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare clng double precision; clat double precision;
begin
  select st_x(location::geometry), st_y(location::geometry) into clng, clat
  from cities where id = p_city_id;
  update profiles set
    home_city_id = p_city_id,
    location = case when clng is null then location
      else st_setsrid(st_makepoint(round(clng/0.02)*0.02, round(clat/0.02)*0.02), 4326)::geography end
  where id = auth.uid();
end;
$$;

-- Set location from a device coordinate. Coarsened server-side too, and the
-- home city is snapped to the nearest known city.
create or replace function set_location_point(p_lng double precision, p_lat double precision)
returns void
language plpgsql security definer set search_path = public as $$
declare nearest bigint;
begin
  select id into nearest from cities
  order by location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit 1;
  update profiles set
    location = st_setsrid(st_makepoint(round(p_lng/0.02)*0.02, round(p_lat/0.02)*0.02), 4326)::geography,
    home_city_id = coalesce(nearest, home_city_id)
  where id = auth.uid();
end;
$$;

grant execute on function set_home_city(bigint) to authenticated;
grant execute on function set_location_point(double precision, double precision) to authenticated;

-- Recreate players_nearby with title/meta columns and viewer-aware ranking.
drop function if exists players_nearby(double precision, int, int, text, text, int);
create function players_nearby(
  radius_km double precision default 25,
  min_rating int default null,
  max_rating int default null,
  time_control text default null,
  availability text default null,
  active_within_hours int default null
)
returns table (
  id uuid, handle text, display_name text, bio text,
  lichess_username text, lichess_ratings jsonb, lichess_verified boolean,
  lichess_title text, lichess_meta jsonb,
  chesscom_username text, chesscom_ratings jsonb, chesscom_verified boolean,
  chesscom_title text, chesscom_meta jsonb,
  preferred_time_controls text[], availability_status text,
  visiting_until date, availability_chips text[], open_today_until timestamptz,
  last_seen_at timestamptz, distance_band text, distance_sort double precision
)
language plpgsql stable security definer set search_path = public as $$
declare
  me_loc geography;
  my_best int;
  my_tcs text[];
begin
  select location,
    greatest(
      coalesce((lichess_ratings->>'rapid')::int, 0),
      coalesce((lichess_ratings->>'blitz')::int, 0),
      coalesce((chesscom_ratings->>'rapid')::int, 0),
      coalesce((chesscom_ratings->>'blitz')::int, 0)
    ),
    preferred_time_controls
  into me_loc, my_best, my_tcs
  from profiles where id = auth.uid();

  return query
  select
    p.id, p.handle, p.display_name, p.bio,
    p.lichess_username, p.lichess_ratings, p.lichess_verified,
    p.lichess_title, p.lichess_meta,
    p.chesscom_username, p.chesscom_ratings, p.chesscom_verified,
    p.chesscom_title, p.chesscom_meta,
    p.preferred_time_controls, p.availability_status,
    p.visiting_until, p.availability_chips, p.open_today_until,
    p.last_seen_at,
    distance_band(case when me_loc is null then null else st_distance(p.location, me_loc) end),
    coalesce(case when me_loc is null then null else st_distance(p.location, me_loc) end, 1e12)
  from profiles p
  where p.id <> auth.uid()
    and p.visible = true
    and not exists (
      select 1 from blocks b
      where (b.blocker = auth.uid() and b.blocked = p.id)
         or (b.blocker = p.id and b.blocked = auth.uid())
    )
    and (me_loc is null or p.location is null or st_dwithin(p.location, me_loc, radius_km * 1000))
    and (availability is null or p.availability_status = availability)
    and (time_control is null or p.preferred_time_controls @> array[time_control])
    and (active_within_hours is null or p.last_seen_at >= now() - make_interval(hours => active_within_hours))
    and (min_rating is null or greatest(
      coalesce((p.lichess_ratings->>'rapid')::int, 0), coalesce((p.lichess_ratings->>'blitz')::int, 0),
      coalesce((p.chesscom_ratings->>'rapid')::int, 0), coalesce((p.chesscom_ratings->>'blitz')::int, 0)
    ) >= min_rating)
    and (max_rating is null or greatest(
      coalesce((p.lichess_ratings->>'rapid')::int, 0), coalesce((p.lichess_ratings->>'blitz')::int, 0),
      coalesce((p.chesscom_ratings->>'rapid')::int, 0), coalesce((p.chesscom_ratings->>'blitz')::int, 0)
    ) <= max_rating)
  order by
    -- up for a game today, then recently active
    (p.open_today_until is not null and p.open_today_until > now()) desc,
    (p.last_seen_at is not null and p.last_seen_at >= now() - interval '48 hours') desc,
    -- shared time control, then closeness in strength
    (my_tcs is not null and p.preferred_time_controls is not null
       and my_tcs && p.preferred_time_controls) desc,
    (case when my_best > 0 and greatest(
        coalesce((p.lichess_ratings->>'rapid')::int, 0), coalesce((p.lichess_ratings->>'blitz')::int, 0),
        coalesce((p.chesscom_ratings->>'rapid')::int, 0), coalesce((p.chesscom_ratings->>'blitz')::int, 0)
      ) > 0
      then abs(my_best - greatest(
        coalesce((p.lichess_ratings->>'rapid')::int, 0), coalesce((p.lichess_ratings->>'blitz')::int, 0),
        coalesce((p.chesscom_ratings->>'rapid')::int, 0), coalesce((p.chesscom_ratings->>'blitz')::int, 0)
      )) else 1000000 end) asc,
    -- then distance and freshness
    coalesce(case when me_loc is null then null else st_distance(p.location, me_loc) end, 1e12) asc,
    p.last_seen_at desc nulls last;
end;
$$;

grant execute on function players_nearby(double precision, int, int, text, text, int) to authenticated;
