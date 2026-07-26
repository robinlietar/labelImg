-- WoodPushers consolidated schema. Paste into Supabase Dashboard > SQL Editor > New query > Run.
-- Already applied 0001-0004? Just run 0005_profiles.sql (it is idempotent).

-- ===== supabase/migrations/0001_init.sql =====
-- WoodPushers initial schema.
-- Postgres + PostGIS. RLS is enabled in 0002_rls.sql.

create extension if not exists postgis;

-- Cities -----------------------------------------------------------------
create table cities (
  id bigint generated always as identity primary key,
  name text not null,
  country_code text not null,
  slug text unique not null,
  population bigint,
  location geography(point) not null,
  last_scraped_at timestamptz,
  created_at timestamptz default now()
);
create index cities_population_idx on cities (population desc nulls last);

-- Places -----------------------------------------------------------------
create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in (
    'club','cafe','bar','park','library','community_center',
    'tournament_venue','shop','other'
  )),
  description text,
  address text,
  city_id bigint references cities(id),
  location geography(point) not null,
  website text,
  opening_notes text,
  source text not null check (source in (
    'osm','claude_research','user_submission','import'
  )),
  source_url text,
  confidence numeric,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index places_location_idx on places using gist (location);
create index places_city_status_idx on places (city_id, status);

-- Place submissions ------------------------------------------------------
create table place_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  payload jsonb not null,
  claude_assessment jsonb,
  place_id uuid references places(id),
  status text not null default 'pending'
    check (status in ('pending','auto_approved','approved','rejected')),
  created_at timestamptz default now()
);
create index place_submissions_status_idx on place_submissions (status);

-- Profiles ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  bio text,
  lichess_username text,
  lichess_ratings jsonb,
  lichess_verified boolean default false,
  chesscom_username text,
  chesscom_ratings jsonb,
  chesscom_verified boolean default false,
  preferred_time_controls text[],
  availability_status text not null default 'local'
    check (availability_status in ('local','visiting')),
  visiting_until date,
  availability_chips text[],
  open_today_until timestamptz,
  home_city_id bigint references cities(id),
  location geography(point),
  visible boolean default true,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);
create index profiles_home_city_idx on profiles (home_city_id);
create index profiles_location_idx on profiles using gist (location);

-- Messaging --------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

-- Safety -----------------------------------------------------------------
create table blocks (
  blocker uuid references profiles(id) on delete cascade,
  blocked uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker, blocked)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references profiles(id),
  reported uuid references profiles(id),
  reason text,
  created_at timestamptz default now()
);

-- City chats -------------------------------------------------------------
create table city_chats (
  city_id bigint primary key references cities(id),
  whatsapp_invite_url text,
  notes text,
  updated_at timestamptz default now()
);

create table city_chat_requests (
  id uuid primary key default gen_random_uuid(),
  city_id bigint references cities(id),
  requested_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (city_id, requested_by)
);

-- Scrape runs ------------------------------------------------------------
create table scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  cities jsonb,
  error text
);

-- keep updated_at fresh on places
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger places_set_updated_at
  before update on places
  for each row execute function set_updated_at();

-- ===== supabase/migrations/0002_rls.sql =====
-- Row Level Security and privacy functions.
-- Principle: approved places are public. Profiles are visible when the owner
-- allows it, but raw coordinates are NEVER exposed: clients read player data
-- through views/RPCs that return only distance bands.

alter table cities enable row level security;
alter table places enable row level security;
alter table place_submissions enable row level security;
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table city_chats enable row level security;
alter table city_chat_requests enable row level security;
alter table scrape_runs enable row level security;

-- Cities: public read.
create policy cities_read on cities for select using (true);

-- Places: only approved rows are publicly readable. All writes go through the
-- service role (which bypasses RLS), so there are no write policies here.
create policy places_read_approved on places
  for select using (status = 'approved');

-- City chats: public read. Edited by admins via service role.
create policy city_chats_read on city_chats for select using (true);

-- City chat requests: a logged-in user can record and see their own demand.
create policy city_chat_requests_insert on city_chat_requests
  for insert with check (auth.uid() = requested_by);
create policy city_chat_requests_read_own on city_chat_requests
  for select using (auth.uid() = requested_by);

-- Submissions: authors can create and read their own.
create policy submissions_insert on place_submissions
  for insert with check (auth.uid() = submitted_by);
create policy submissions_read_own on place_submissions
  for select using (auth.uid() = submitted_by);

-- Profiles ---------------------------------------------------------------
-- Row visibility: your own row, or any row the owner marked visible.
create policy profiles_read on profiles
  for select using (visible = true or id = auth.uid());
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());

-- Column-level guard: raw location is never selectable by clients, even on a
-- direct `select *`. Distance is only ever returned by the RPCs below.
revoke select (location) on profiles from anon, authenticated;

-- Messaging --------------------------------------------------------------
create policy conversations_read_member on conversations
  for select using (
    exists (
      select 1 from conversation_members m
      where m.conversation_id = conversations.id and m.profile_id = auth.uid()
    )
  );

create policy members_read on conversation_members
  for select using (
    exists (
      select 1 from conversation_members m
      where m.conversation_id = conversation_members.conversation_id
        and m.profile_id = auth.uid()
    )
  );

create policy messages_read_member on messages
  for select using (
    exists (
      select 1 from conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.profile_id = auth.uid()
    )
  );

-- Insert a message only if you are a member of the conversation, you are the
-- sender, and no block exists in either direction with any other member.
create policy messages_insert_member on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.profile_id = auth.uid()
    )
    and not exists (
      select 1
      from conversation_members other
      join blocks b
        on (b.blocker = auth.uid() and b.blocked = other.profile_id)
        or (b.blocker = other.profile_id and b.blocked = auth.uid())
      where other.conversation_id = messages.conversation_id
        and other.profile_id <> auth.uid()
    )
  );

-- Blocks and reports: a user manages their own.
create policy blocks_all_own on blocks
  for all using (blocker = auth.uid()) with check (blocker = auth.uid());
create policy reports_insert_own on reports
  for insert with check (reporter = auth.uid());

-- Distance banding -------------------------------------------------------
-- Coarse label only. Exact metres never leave the database.
create or replace function distance_band(meters double precision)
returns text language sql immutable as $$
  select case
    when meters is null then 'unknown'
    when meters < 1000 then '< 1 km'
    when meters < 2000 then '~2 km'
    when meters < 5000 then '~5 km'
    when meters < 10000 then '~10 km'
    when meters < 25000 then '~25 km'
    else 'same region'
  end;
$$;

-- ===== supabase/migrations/0003_functions.sql =====
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

-- ===== supabase/migrations/0004_scraper.sql =====
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

-- ===== supabase/migrations/0005_profiles.sql =====
-- Profile creation and self-declared rating. Idempotent: safe to run on top of
-- the initial schema.

alter table profiles add column if not exists self_rating_band text;

-- Create a profile with a COARSE location derived from the home city centroid
-- (rounded to ~0.02 degrees). We never collect or store a precise position.
create or replace function create_profile(
  p_id uuid, p_handle text, p_display_name text, p_home_city_id bigint,
  p_time_controls text[], p_chips text[], p_rating_band text, p_visible boolean
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  clng double precision;
  clat double precision;
begin
  select st_x(location::geometry), st_y(location::geometry)
    into clng, clat
  from cities where id = p_home_city_id;

  insert into profiles (
    id, handle, display_name, home_city_id, preferred_time_controls,
    availability_chips, self_rating_band, visible, location, last_seen_at
  ) values (
    p_id, p_handle, p_display_name, p_home_city_id, p_time_controls,
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

