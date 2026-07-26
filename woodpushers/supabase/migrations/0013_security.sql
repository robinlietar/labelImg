-- Security hardening from the SQL audit. Idempotent.
--
-- 1) profiles.location was still readable: a column-level REVOKE is a no-op
--    while the table-level SELECT grant exists. Revoke the table grant and
--    grant every column EXCEPT location. (New columns added later must be
--    granted here explicitly; that is intentional: closed by default.)
-- 2) Any user could PATCH their own trust columns (lichess_verified etc)
--    through the table UPDATE grant. Restrict updates to safe columns; the
--    verification flows write through the service role.
-- 3) Direct INSERT could also plant verified flags. All inserts go through
--    create_profile now.
-- 4) create_profile took the target id as an argument while SECURITY DEFINER:
--    anyone could overwrite anyone's profile. It now uses auth.uid() only.
-- 5) players_nearby crashed on every call: unqualified columns in the priming
--    SELECT are ambiguous against the RETURNS TABLE variables.
-- 6) place_detail's signal count ran under caller RLS and was always 0 or 1.
-- 7) mark_read accepted any conversation id; now requires membership.
-- 8) Service-only functions lose their default anon/authenticated EXECUTE.

-- (1) profiles read: everything except location.
revoke select on profiles from anon, authenticated;
grant select (
  id, handle, display_name, bio,
  lichess_username, lichess_ratings, lichess_verified,
  chesscom_username, chesscom_ratings, chesscom_verified,
  preferred_time_controls, availability_status, visiting_until,
  availability_chips, open_today_until, home_city_id, visible,
  last_seen_at, created_at, self_rating_band,
  lichess_title, chesscom_title, lichess_meta, chesscom_meta,
  ratings_refreshed_at
) on profiles to anon, authenticated;

-- (2) profiles write: safe columns only.
revoke update on profiles from anon, authenticated;
grant update (
  display_name, bio, preferred_time_controls, availability_status,
  visiting_until, availability_chips, open_today_until, visible,
  self_rating_band
) on profiles to authenticated;

-- (3) no direct inserts.
revoke insert on profiles from anon, authenticated;

-- (4) create_profile bound to the caller.
drop function if exists create_profile(uuid, text, text, bigint, text[], text[], text, boolean);
create or replace function create_profile(
  p_handle text, p_display_name text, p_home_city_id bigint,
  p_time_controls text[], p_chips text[], p_rating_band text, p_visible boolean
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  clng double precision;
  clat double precision;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select st_x(c.location::geometry), st_y(c.location::geometry)
    into clng, clat
  from cities c where c.id = p_home_city_id;

  insert into profiles (
    id, handle, display_name, home_city_id, preferred_time_controls,
    availability_chips, self_rating_band, visible, location, last_seen_at
  ) values (
    uid, p_handle, p_display_name, p_home_city_id, p_time_controls,
    p_chips, p_rating_band, coalesce(p_visible, true),
    case when clng is null then null
         else st_setsrid(st_makepoint(
           round(clng / 0.02) * 0.02, round(clat / 0.02) * 0.02), 4326)::geography
    end,
    now()
  )
  on conflict (id) do update set
    handle = excluded.handle,
    display_name = excluded.display_name,
    home_city_id = excluded.home_city_id,
    preferred_time_controls = excluded.preferred_time_controls,
    availability_chips = excluded.availability_chips,
    self_rating_band = excluded.self_rating_band,
    visible = excluded.visible,
    location = excluded.location;
end;
$$;
revoke execute on function create_profile(text, text, bigint, text[], text[], text, boolean) from public, anon;
grant execute on function create_profile(text, text, bigint, text[], text[], text, boolean) to authenticated;

-- (5) players_nearby: qualify the priming SELECT (the 0009 version errored
-- with "column reference is ambiguous" on every call) and add
-- self_rating_band to the returned columns. Return type changes, so drop first.
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
  chesscom_title text, chesscom_meta jsonb, self_rating_band text,
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
  select pr.location,
    greatest(
      coalesce((pr.lichess_ratings->>'rapid')::int, 0),
      coalesce((pr.lichess_ratings->>'blitz')::int, 0),
      coalesce((pr.chesscom_ratings->>'rapid')::int, 0),
      coalesce((pr.chesscom_ratings->>'blitz')::int, 0)
    ),
    pr.preferred_time_controls
  into me_loc, my_best, my_tcs
  from profiles pr where pr.id = auth.uid();

  return query
  select
    p.id, p.handle, p.display_name, p.bio,
    p.lichess_username, p.lichess_ratings, p.lichess_verified,
    p.lichess_title, p.lichess_meta,
    p.chesscom_username, p.chesscom_ratings, p.chesscom_verified,
    p.chesscom_title, p.chesscom_meta, p.self_rating_band,
    p.preferred_time_controls, p.availability_status,
    p.visiting_until, p.availability_chips, p.open_today_until,
    p.last_seen_at,
    distance_band(case when me_loc is null then null else st_distance(p.location, me_loc) end),
    coalesce(case when me_loc is null then null else st_distance(p.location, me_loc) end, 1e12)
  from profiles p
  where p.id <> auth.uid()
    and p.visible = true
    and not is_blocked_pair(auth.uid(), p.id)
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
    (p.open_today_until is not null and p.open_today_until > now()) desc,
    (p.last_seen_at is not null and p.last_seen_at >= now() - interval '48 hours') desc,
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
    coalesce(case when me_loc is null then null else st_distance(p.location, me_loc) end, 1e12) asc,
    p.last_seen_at desc nulls last;
end;
$$;
grant execute on function players_nearby(double precision, int, int, text, text, int) to authenticated;

-- (6) place_detail: definer so the signal count is the real total.
create or replace function place_detail(p_id uuid)
returns table (
  id uuid, name text, kind text, description text, address text,
  website text, opening_notes text, source text, source_url text,
  lng double precision, lat double precision,
  city_slug text, city_name text, signals int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.kind, p.description, p.address, p.website,
         p.opening_notes, p.source, p.source_url,
         st_x(p.location::geometry), st_y(p.location::geometry),
         c.slug, c.name,
         (select count(*)::int from place_signals s where s.place_id = p.id)
  from places p
  left join cities c on c.id = p.city_id
  where p.id = p_id and p.status = 'approved';
$$;
grant execute on function place_detail(uuid) to anon, authenticated;

-- (7) mark_read requires membership.
create or replace function mark_read(p_conversation_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_conversation_member(p_conversation_id, auth.uid()) then
    raise exception 'not a member';
  end if;
  insert into conversation_reads (conversation_id, profile_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, profile_id)
    do update set last_read_at = now();
end;
$$;
grant execute on function mark_read(uuid) to authenticated;

-- (8) service-only functions are not client-callable.
do $$
declare fn text;
begin
  foreach fn in array array[
    'next_cities_to_scrape(int)',
    'cities_by_slugs(text[])',
    'places_for_dedupe(bigint)',
    'insert_scraped_place(text,text,text,text,bigint,double precision,double precision,text,text,text,text,numeric,text)',
    'mark_city_scraped(bigint)',
    'upsert_city(text,text,text,bigint,double precision,double precision)',
    'nearest_city_id(double precision,double precision)',
    'profiles_to_refresh(int)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
