-- Read/write RPCs. Security definer where they must read columns (like raw
-- location) that clients cannot read directly, but they only ever return
-- safe, computed values.

-- Places in a map viewport (approved only). lng/lat returned for the client
-- to cluster with supercluster.
create or replace function places_in_bbox(
  west double precision, south double precision,
  east double precision, north double precision,
  kinds text[] default null
)
returns table (
  id uuid, name text, kind text, address text, website text,
  source text, lng double precision, lat double precision
)
language sql stable as $$
  select p.id, p.name, p.kind, p.address, p.website, p.source,
         st_x(p.location::geometry) as lng,
         st_y(p.location::geometry) as lat
  from places p
  where p.status = 'approved'
    and (kinds is null or p.kind = any(kinds))
    and st_intersects(
      p.location,
      st_makeenvelope(west, south, east, north, 4326)::geography
    );
$$;

-- Places for a city page.
create or replace function places_for_city(city_slug text)
returns table (
  id uuid, name text, kind text, address text, website text,
  source text, lng double precision, lat double precision
)
language sql stable as $$
  select p.id, p.name, p.kind, p.address, p.website, p.source,
         st_x(p.location::geometry) as lng,
         st_y(p.location::geometry) as lat
  from places p
  join cities c on c.id = p.city_id
  where p.status = 'approved' and c.slug = city_slug;
$$;

-- Nearby players for the directory. Centered on the caller's own coarse
-- location. Returns distance bands, never coordinates. Excludes self, hidden
-- profiles, and anyone in a block relationship with the caller.
create or replace function players_nearby(
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
  chesscom_username text, chesscom_ratings jsonb, chesscom_verified boolean,
  preferred_time_controls text[], availability_status text,
  visiting_until date, availability_chips text[], open_today_until timestamptz,
  last_seen_at timestamptz, distance_band text, distance_sort double precision
)
language plpgsql stable security definer set search_path = public as $$
declare
  me_loc geography;
begin
  select location into me_loc from profiles where id = auth.uid();

  return query
  select
    p.id, p.handle, p.display_name, p.bio,
    p.lichess_username, p.lichess_ratings, p.lichess_verified,
    p.chesscom_username, p.chesscom_ratings, p.chesscom_verified,
    p.preferred_time_controls, p.availability_status,
    p.visiting_until, p.availability_chips, p.open_today_until,
    p.last_seen_at,
    distance_band(
      case when me_loc is null then null
           else st_distance(p.location, me_loc) end
    ) as distance_band,
    coalesce(
      case when me_loc is null then null
           else st_distance(p.location, me_loc) end,
      1e12
    ) as distance_sort
  from profiles p
  where p.id <> auth.uid()
    and p.visible = true
    and not exists (
      select 1 from blocks b
      where (b.blocker = auth.uid() and b.blocked = p.id)
         or (b.blocker = p.id and b.blocked = auth.uid())
    )
    and (
      me_loc is null or p.location is null
      or st_dwithin(p.location, me_loc, radius_km * 1000)
    )
    and (availability is null or p.availability_status = availability)
    and (time_control is null or p.preferred_time_controls @> array[time_control])
    and (
      active_within_hours is null
      or p.last_seen_at >= now() - make_interval(hours => active_within_hours)
    )
    and (
      min_rating is null
      or greatest(
           coalesce((p.lichess_ratings->>'rapid')::int, 0),
           coalesce((p.lichess_ratings->>'blitz')::int, 0),
           coalesce((p.chesscom_ratings->>'rapid')::int, 0),
           coalesce((p.chesscom_ratings->>'blitz')::int, 0)
         ) >= min_rating
    )
    and (
      max_rating is null
      or greatest(
           coalesce((p.lichess_ratings->>'rapid')::int, 0),
           coalesce((p.lichess_ratings->>'blitz')::int, 0),
           coalesce((p.chesscom_ratings->>'rapid')::int, 0),
           coalesce((p.chesscom_ratings->>'blitz')::int, 0)
         ) <= max_rating
    )
  order by
    (p.last_seen_at is not null and p.last_seen_at >= now() - interval '48 hours') desc,
    distance_sort asc,
    p.last_seen_at desc nulls last;
end;
$$;

-- Find-or-create a 1:1 conversation with another player. Enforces block
-- checks and a daily cap of 10 newly started conversations per user.
create or replace function start_conversation(other_profile uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  conv uuid;
  started_today int;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = other_profile then raise exception 'cannot message yourself'; end if;

  if exists (
    select 1 from blocks b
    where (b.blocker = me and b.blocked = other_profile)
       or (b.blocker = other_profile and b.blocked = me)
  ) then
    raise exception 'blocked';
  end if;

  -- Existing 1:1 conversation between exactly these two?
  select cm.conversation_id into conv
  from conversation_members cm
  join conversation_members cm2 on cm2.conversation_id = cm.conversation_id
  where cm.profile_id = me and cm2.profile_id = other_profile
  group by cm.conversation_id
  having count(*) over (partition by cm.conversation_id) = 2
  limit 1;

  if conv is not null then
    return conv;
  end if;

  -- Rate limit: at most 10 new conversations per calling user per 24h.
  select count(*) into started_today
  from conversations c
  join conversation_members cm on cm.conversation_id = c.id
  where cm.profile_id = me and c.created_at >= now() - interval '24 hours';
  if started_today >= 10 then
    raise exception 'daily conversation limit reached';
  end if;

  insert into conversations default values returning id into conv;
  insert into conversation_members (conversation_id, profile_id)
    values (conv, me), (conv, other_profile);
  return conv;
end;
$$;

-- Presence ping, throttled client-side to once per 5 minutes.
create or replace function touch_presence()
returns void language sql security definer set search_path = public as $$
  update profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function places_in_bbox(double precision, double precision, double precision, double precision, text[]) to anon, authenticated;
grant execute on function places_for_city(text) to anon, authenticated;
grant execute on function players_nearby(double precision, int, int, text, text, int) to authenticated;
grant execute on function start_conversation(uuid) to authenticated;
grant execute on function touch_presence() to authenticated;
grant execute on function distance_band(double precision) to anon, authenticated;
