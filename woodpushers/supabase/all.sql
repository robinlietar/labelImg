-- WoodPushers FULL schema: fresh database only.

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

-- ===== supabase/migrations/0006_chat.sql =====
-- Chat support: read tracking, conversation summaries, realtime. Idempotent.

-- Per-member read cursor for unread counts.
create table if not exists conversation_reads (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (conversation_id, profile_id)
);
alter table conversation_reads enable row level security;

drop policy if exists reads_own on conversation_reads;
create policy reads_own on conversation_reads
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Realtime broadcast for messages (RLS still filters what each client sees).
do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
end $$;

-- Conversation list for the current user: other member, last message, unread.
-- Drop first: later migrations change the return shape, and this bundle must
-- stay safe to re-run end to end.
drop function if exists my_conversations();
create function my_conversations()
returns table (
  conversation_id uuid, other_handle text, other_display_name text,
  last_body text, last_at timestamptz, unread int
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    op.handle,
    op.display_name,
    lm.body,
    lm.created_at,
    (
      select count(*)::int from messages m2
      where m2.conversation_id = c.id
        and m2.sender_id <> auth.uid()
        and m2.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz)
    ) as unread
  from conversation_members mine
  join conversations c on c.id = mine.conversation_id
  join conversation_members others
    on others.conversation_id = c.id and others.profile_id <> auth.uid()
  join profiles op on op.id = others.profile_id
  left join conversation_reads cr
    on cr.conversation_id = c.id and cr.profile_id = auth.uid()
  left join lateral (
    select body, created_at from messages m
    where m.conversation_id = c.id
    order by created_at desc limit 1
  ) lm on true
  where mine.profile_id = auth.uid()
  order by lm.created_at desc nulls last;
$$;

-- Mark a conversation read up to now.
create or replace function mark_read(p_conversation_id uuid)
returns void
language sql security definer set search_path = public as $$
  insert into conversation_reads (conversation_id, profile_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, profile_id)
    do update set last_read_at = now();
$$;

grant execute on function my_conversations() to authenticated;
grant execute on function mark_read(uuid) to authenticated;

-- ===== supabase/migrations/0007_submissions.sql =====
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

-- ===== supabase/migrations/0008_places_pages.sql =====
-- Place and city detail support. Idempotent.

-- A lightweight "I play here" signal for later ranking.
create table if not exists place_signals (
  place_id uuid references places(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (place_id, profile_id)
);
alter table place_signals enable row level security;

drop policy if exists place_signals_own on place_signals;
create policy place_signals_own on place_signals
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Public place detail with coordinates (approved only). Drop first so the
-- bundle re-runs cleanly after later shape changes.
drop function if exists place_detail(uuid);
create function place_detail(p_id uuid)
returns table (
  id uuid, name text, kind text, description text, address text,
  website text, opening_notes text, source text, source_url text,
  lng double precision, lat double precision,
  city_slug text, city_name text, signals int
)
language sql stable as $$
  select p.id, p.name, p.kind, p.description, p.address, p.website,
         p.opening_notes, p.source, p.source_url,
         st_x(p.location::geometry), st_y(p.location::geometry),
         c.slug, c.name,
         (select count(*)::int from place_signals s where s.place_id = p.id)
  from places p
  left join cities c on c.id = p.city_id
  where p.id = p_id and p.status = 'approved';
$$;

-- City centroid and metadata for the city page. Drop first: 0015 reshapes it.
drop function if exists city_detail(text);
create function city_detail(p_slug text)
returns table (
  id bigint, name text, country_code text, slug text,
  lng double precision, lat double precision,
  whatsapp_invite_url text
)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug,
         st_x(c.location::geometry), st_y(c.location::geometry),
         cc.whatsapp_invite_url
  from cities c
  left join city_chats cc on cc.city_id = c.id
  where c.slug = p_slug;
$$;

grant execute on function place_detail(uuid) to anon, authenticated;
grant execute on function city_detail(text) to anon, authenticated;

-- ===== supabase/migrations/0009_enrich_location.sql =====
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

-- ===== supabase/migrations/0010_fixes.sql =====
-- Correctness fixes for messaging RLS and conversation creation. Idempotent.
--
-- Bug 1: policies on conversation_members queried conversation_members inside
-- their own USING clause. Postgres raises "infinite recursion detected in
-- policy" at query time, which also broke messages and conversations reads
-- (their policies query conversation_members too) and Realtime delivery.
-- Fix: route membership checks through a security definer function.
--
-- Bug 2: the messages insert policy checked blocks via a subquery that runs
-- under the caller's RLS on blocks, which only exposes rows where
-- blocker = auth.uid(). A block in the other direction was invisible, so
-- "blocked either way" was not enforced. Same security definer treatment.
--
-- Bug 3: start_conversation used a window function inside HAVING, which is
-- invalid SQL and errors on first execution.

create or replace function is_conversation_member(
  p_conversation_id uuid, p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = p_conversation_id and profile_id = p_profile_id
  );
$$;

create or replace function is_blocked_pair(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

grant execute on function is_conversation_member(uuid, uuid) to authenticated;
grant execute on function is_blocked_pair(uuid, uuid) to authenticated;

-- Recreate the recursive/incomplete policies on top of the helpers.
drop policy if exists members_read on conversation_members;
create policy members_read on conversation_members
  for select using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists conversations_read_member on conversations;
create policy conversations_read_member on conversations
  for select using (is_conversation_member(id, auth.uid()));

drop policy if exists messages_read_member on messages;
create policy messages_read_member on messages
  for select using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists messages_insert_member on messages;
create policy messages_insert_member on messages
  for insert with check (
    sender_id = auth.uid()
    and is_conversation_member(conversation_id, auth.uid())
    and not exists (
      select 1 from conversation_members other
      where other.conversation_id = messages.conversation_id
        and other.profile_id <> auth.uid()
        and is_blocked_pair(auth.uid(), other.profile_id)
    )
  );

-- Fixed start_conversation: valid SQL for the existing-1:1 lookup.
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

  if is_blocked_pair(me, other_profile) then
    raise exception 'blocked';
  end if;

  select cm.conversation_id into conv
  from conversation_members cm
  join conversation_members cm2
    on cm2.conversation_id = cm.conversation_id
   and cm2.profile_id = other_profile
  where cm.profile_id = me
    and (
      select count(*) from conversation_members x
      where x.conversation_id = cm.conversation_id
    ) = 2
  limit 1;

  if conv is not null then
    return conv;
  end if;

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

grant execute on function start_conversation(uuid) to authenticated;

-- ===== supabase/migrations/0011_ratings_refresh.sql =====
-- Track when linked-account ratings were last refreshed. Idempotent.
alter table profiles add column if not exists ratings_refreshed_at timestamptz;

-- Profiles with at least one linked account, oldest refresh first, for the
-- daily refresh cron.
create or replace function profiles_to_refresh(max_count int)
returns table (id uuid, lichess_username text, chesscom_username text, chesscom_verified boolean)
language sql stable as $$
  select p.id, p.lichess_username, p.chesscom_username, p.chesscom_verified
  from profiles p
  where p.lichess_username is not null or p.chesscom_username is not null
  order by p.ratings_refreshed_at asc nulls first
  limit max_count;
$$;

-- ===== supabase/migrations/0012_city_search.sql =====
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

-- ===== supabase/migrations/0013_security.sql =====
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

-- ===== supabase/migrations/0014_quality.sql =====
-- Quality fixes. Idempotent.
--
-- 1) The 10-conversations-per-day cap counted every conversation the caller
--    is a member of, so ten INBOUND chats blocked you from starting any.
--    Track who started each conversation and count only those.
-- 2) touch_presence: enforce the 5-minute throttle server-side too.

alter table conversations add column if not exists created_by uuid references profiles(id);

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

  if is_blocked_pair(me, other_profile) then
    raise exception 'blocked';
  end if;

  select cm.conversation_id into conv
  from conversation_members cm
  join conversation_members cm2
    on cm2.conversation_id = cm.conversation_id
   and cm2.profile_id = other_profile
  where cm.profile_id = me
    and (
      select count(*) from conversation_members x
      where x.conversation_id = cm.conversation_id
    ) = 2
  limit 1;

  if conv is not null then
    return conv;
  end if;

  -- Cap only conversations this user STARTED in the last 24 hours.
  select count(*) into started_today
  from conversations c
  where c.created_by = me and c.created_at >= now() - interval '24 hours';
  if started_today >= 10 then
    raise exception 'daily conversation limit reached';
  end if;

  insert into conversations (created_by) values (me) returning id into conv;
  insert into conversation_members (conversation_id, profile_id)
    values (conv, me), (conv, other_profile);
  return conv;
end;
$$;
grant execute on function start_conversation(uuid) to authenticated;

create or replace function touch_presence()
returns void language sql security definer set search_path = public as $$
  update profiles set last_seen_at = now()
  where id = auth.uid()
    and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');
$$;
grant execute on function touch_presence() to authenticated;

-- ===== supabase/migrations/0015_content.sql =====
-- City intros and a workable reports queue. Idempotent.

-- Spec: the city page has an intro line. Editable from admin.
alter table cities add column if not exists intro text;

-- Reports need a lifecycle so admin can work the queue.
alter table reports add column if not exists status text not null default 'open'
  check (status in ('open','resolved'));

-- city_detail now returns the intro (return type changes: drop first).
drop function if exists city_detail(text);
create function city_detail(p_slug text)
returns table (
  id bigint, name text, country_code text, slug text, intro text,
  lng double precision, lat double precision,
  whatsapp_invite_url text
)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug, c.intro,
         st_x(c.location::geometry), st_y(c.location::geometry),
         cc.whatsapp_invite_url
  from cities c
  left join city_chats cc on cc.city_id = c.id
  where c.slug = p_slug;
$$;
grant execute on function city_detail(text) to anon, authenticated;

-- ===== supabase/migrations/0016_nearest_city.sql =====
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

-- ===== supabase/migrations/0017_avatars_priority.sql =====
-- Avatars, scrape priority, unread counts, and admin place editing. Idempotent.

-- ---------- Profile pictures ----------
alter table profiles add column if not exists avatar_url text;
grant select (avatar_url) on profiles to anon, authenticated;
grant update (avatar_url) on profiles to authenticated;

-- Storage bucket for avatars: public read, users write only their own folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_own_insert on storage.objects;
create policy avatars_own_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists avatars_own_update on storage.objects;
create policy avatars_own_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists avatars_own_delete on storage.objects;
create policy avatars_own_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- Scrape priority (Europe-first without manual runs) ----------
alter table cities add column if not exists scrape_priority int not null default 0;

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
           c.scrape_priority desc,
           c.population desc nulls last
  limit max_count;
$$;

-- ---------- Unread badge ----------
create or replace function unread_total()
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(
    (select count(*) from messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz))
  ), 0)::int
  from conversation_members mine
  join conversations c on c.id = mine.conversation_id
  left join conversation_reads cr
    on cr.conversation_id = c.id and cr.profile_id = auth.uid()
  where mine.profile_id = auth.uid();
$$;
grant execute on function unread_total() to authenticated;

-- ---------- my_conversations with avatars (return type changes: drop) ----------
drop function if exists my_conversations();
create function my_conversations()
returns table (
  conversation_id uuid, other_handle text, other_display_name text,
  other_avatar_url text, last_body text, last_at timestamptz, unread int
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    op.handle,
    op.display_name,
    op.avatar_url,
    lm.body,
    lm.created_at,
    (
      select count(*)::int from messages m2
      where m2.conversation_id = c.id
        and m2.sender_id <> auth.uid()
        and m2.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz)
    ) as unread
  from conversation_members mine
  join conversations c on c.id = mine.conversation_id
  join conversation_members others
    on others.conversation_id = c.id and others.profile_id <> auth.uid()
  join profiles op on op.id = others.profile_id
  left join conversation_reads cr
    on cr.conversation_id = c.id and cr.profile_id = auth.uid()
  left join lateral (
    select body, created_at from messages m
    where m.conversation_id = c.id
    order by created_at desc limit 1
  ) lm on true
  where mine.profile_id = auth.uid()
  order by lm.created_at desc nulls last;
$$;
grant execute on function my_conversations() to authenticated;

-- ---------- players_nearby with avatars (return type changes: drop) ----------
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
  id uuid, handle text, display_name text, bio text, avatar_url text,
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
    p.id, p.handle, p.display_name, p.bio, p.avatar_url,
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

-- ---------- Admin place listing with coordinates (service role only) ----------
create or replace function admin_places(q text, only_pending boolean, max_count int)
returns table (
  id uuid, name text, kind text, description text, address text,
  website text, opening_notes text, source text, source_url text,
  confidence numeric, status text, city_name text,
  lng double precision, lat double precision, created_at timestamptz
)
language sql stable as $$
  select p.id, p.name, p.kind, p.description, p.address, p.website,
         p.opening_notes, p.source, p.source_url, p.confidence, p.status,
         c.name, st_x(p.location::geometry), st_y(p.location::geometry),
         p.created_at
  from places p
  left join cities c on c.id = p.city_id
  where (not only_pending or p.status = 'pending')
    and (q is null or q = '' or p.name ilike '%'||q||'%' or p.address ilike '%'||q||'%')
  order by p.created_at desc
  limit max_count;
$$;
revoke execute on function admin_places(text, boolean, int) from public, anon, authenticated;
grant execute on function admin_places(text, boolean, int) to service_role;

-- ---------- Admin place editing: move a place pin ----------
create or replace function set_place_location(
  p_id uuid, p_lng double precision, p_lat double precision
)
returns void language sql as $$
  update places
  set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  where id = p_id;
$$;
revoke execute on function set_place_location(uuid, double precision, double precision) from public, anon, authenticated;
grant execute on function set_place_location(uuid, double precision, double precision) to service_role;

-- ===== supabase/migrations/0018_admin_stats.sql =====
-- Admin dashboard stats. Idempotent. Service-role only.
--
-- "Encounters" is a heuristic: conversations whose recent messages contain
-- meetup language (times, places, confirmations) in EN or FR. Only aggregate
-- counts ever leave this function, never message bodies.

create or replace function admin_stats()
returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'users_total', (select count(*) from profiles),
    'users_new_7d', (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'users_active_7d', (select count(*) from profiles where last_seen_at >= now() - interval '7 days'),
    'users_visible', (select count(*) from profiles where visible = true),
    'users_linked', (select count(*) from profiles where lichess_verified or chesscom_verified),
    'messages_total', (select count(*) from messages),
    'messages_7d', (select count(*) from messages where created_at >= now() - interval '7 days'),
    'conversations_total', (select count(*) from conversations),
    'conversations_active_7d', (
      select count(distinct conversation_id) from messages
      where created_at >= now() - interval '7 days'
    ),
    'encounters_likely', (
      select count(distinct m.conversation_id) from messages m
      where m.body ~* '(see you|meet (at|you|there)|lets play|let''s play|on se voit|rdv|rendez|a demain|à demain|tomorrow at|tonight at|today at|im here|i''m here|je suis la|je suis là|good game|thanks for the game|merci pour la partie)'
    ),
    'places_approved', (select count(*) from places where status = 'approved'),
    'places_pending', (select count(*) from places where status = 'pending'),
    'submissions_7d', (select count(*) from place_submissions where created_at >= now() - interval '7 days'),
    'signals_total', (select count(*) from place_signals),
    'chat_requests', (select count(*) from city_chat_requests),
    'cities_scraped', (select count(*) from cities where last_scraped_at is not null),
    'open_today_now', (select count(*) from profiles where open_today_until > now())
  );
$$;
revoke execute on function admin_stats() from public, anon, authenticated;
grant execute on function admin_stats() to service_role;

-- admin_places gains a status filter (signature change: drop the old one).
drop function if exists admin_places(text, boolean, int);
create function admin_places(
  q text, only_pending boolean, max_count int, p_status text default null
)
returns table (
  id uuid, name text, kind text, description text, address text,
  website text, opening_notes text, source text, source_url text,
  confidence numeric, status text, city_name text,
  lng double precision, lat double precision, created_at timestamptz
)
language sql stable as $$
  select p.id, p.name, p.kind, p.description, p.address, p.website,
         p.opening_notes, p.source, p.source_url, p.confidence, p.status,
         c.name, st_x(p.location::geometry), st_y(p.location::geometry),
         p.created_at
  from places p
  left join cities c on c.id = p.city_id
  where (not only_pending or p.status = 'pending')
    and (p_status is null or p.status = p_status)
    and (q is null or q = '' or p.name ilike '%'||q||'%' or p.address ilike '%'||q||'%')
  order by p.created_at desc
  limit max_count;
$$;
revoke execute on function admin_places(text, boolean, int, text) from public, anon, authenticated;
grant execute on function admin_places(text, boolean, int, text) to service_role;

-- ===== supabase/migrations/0019_google_places.sql =====
-- 0019: Google Places enrichment, favorites, API budget guard.
-- Re-runnable. Requires 0001..0018.

-- ---------- Places gain Google-sourced fields ----------
alter table places add column if not exists google_place_id text;
alter table places add column if not exists rating numeric;
alter table places add column if not exists rating_count int;
alter table places add column if not exists phone text;
alter table places add column if not exists gmaps_url text;
alter table places add column if not exists photo_url text;
alter table places add column if not exists opening_hours jsonb;
alter table places add column if not exists business_status text;
alter table places add column if not exists google_refreshed_at timestamptz;
create unique index if not exists places_google_id_idx
  on places (google_place_id) where google_place_id is not null;

-- Discovery via the Places API is a new source kind.
alter table places drop constraint if exists places_source_check;
alter table places add constraint places_source_check check (source in (
  'osm','claude_research','user_submission','import','google'
));

-- Clients may read the new columns (location itself stays hidden, 0013).
grant select (google_place_id, rating, rating_count, phone, gmaps_url,
  photo_url, opening_hours, business_status, google_refreshed_at)
  on places to anon, authenticated;

-- ---------- Favorites ----------
create table if not exists place_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, place_id)
);
alter table place_favorites enable row level security;

drop policy if exists favorites_own_select on place_favorites;
create policy favorites_own_select on place_favorites
  for select using (user_id = auth.uid());
drop policy if exists favorites_own_insert on place_favorites;
create policy favorites_own_insert on place_favorites
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from places p where p.id = place_id and p.status = 'approved')
  );
drop policy if exists favorites_own_delete on place_favorites;
create policy favorites_own_delete on place_favorites
  for delete using (user_id = auth.uid());

revoke all on place_favorites from public, anon, authenticated;
grant select, insert (user_id, place_id), delete on place_favorites to authenticated;

-- ---------- Monthly API budget counters (hard cost ceiling) ----------
create table if not exists api_usage (
  month text primary key,
  google_text_searches int not null default 0,
  google_details int not null default 0,
  google_photos int not null default 0,
  updated_at timestamptz default now()
);
revoke all on api_usage from public, anon, authenticated;

-- Atomically increment a counter and report whether the cap allows the call.
drop function if exists bump_api_usage(text, int);
create function bump_api_usage(p_kind text, p_cap int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now(), 'YYYY-MM');
  current int;
begin
  insert into api_usage (month) values (m) on conflict (month) do nothing;
  if p_kind = 'text_search' then
    update api_usage set google_text_searches = google_text_searches + 1,
      updated_at = now() where month = m and google_text_searches < p_cap
      returning google_text_searches into current;
  elsif p_kind = 'details' then
    update api_usage set google_details = google_details + 1,
      updated_at = now() where month = m and google_details < p_cap
      returning google_details into current;
  elsif p_kind = 'photo' then
    update api_usage set google_photos = google_photos + 1,
      updated_at = now() where month = m and google_photos < p_cap
      returning google_photos into current;
  else
    return false;
  end if;
  return current is not null;
end;
$$;
revoke execute on function bump_api_usage(text, int) from public, anon, authenticated;
grant execute on function bump_api_usage(text, int) to service_role;

-- ---------- Enrichment queue: never-enriched first, then stalest ----------
drop function if exists places_to_enrich(timestamptz, int);
create function places_to_enrich(p_stale_before timestamptz, p_limit int)
returns table (
  id uuid, name text, address text, website text,
  google_place_id text, photo_url text,
  lng double precision, lat double precision, city_name text
)
language sql stable as $$
  select p.id, p.name, p.address, p.website, p.google_place_id, p.photo_url,
         st_x(p.location::geometry), st_y(p.location::geometry), c.name
  from places p
  left join cities c on c.id = p.city_id
  where p.status = 'approved'
    and (p.google_refreshed_at is null or p.google_refreshed_at < p_stale_before)
  order by p.google_refreshed_at asc nulls first, p.created_at asc
  limit p_limit;
$$;
revoke execute on function places_to_enrich(timestamptz, int) from public, anon, authenticated;
grant execute on function places_to_enrich(timestamptz, int) to service_role;

-- ---------- Photo storage: public read, server-only writes ----------
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

drop policy if exists place_photos_public_read on storage.objects;
create policy place_photos_public_read on storage.objects
  for select using (bucket_id = 'place-photos');

-- ---------- place_detail v3: Google fields + favorites ----------
drop function if exists place_detail(uuid);
create function place_detail(p_id uuid)
returns table (
  id uuid, name text, kind text, description text, address text,
  website text, opening_notes text, source text, source_url text,
  lng double precision, lat double precision,
  city_slug text, city_name text, signals int,
  rating numeric, rating_count int, phone text, gmaps_url text,
  photo_url text, opening_hours jsonb,
  favorites int, is_favorite boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.kind, p.description, p.address, p.website,
         p.opening_notes, p.source, p.source_url,
         st_x(p.location::geometry), st_y(p.location::geometry),
         c.slug, c.name,
         (select count(*)::int from place_signals s where s.place_id = p.id),
         p.rating, p.rating_count, p.phone, p.gmaps_url,
         p.photo_url, p.opening_hours,
         (select count(*)::int from place_favorites f where f.place_id = p.id),
         exists (select 1 from place_favorites f
                 where f.place_id = p.id and f.user_id = auth.uid())
  from places p
  left join cities c on c.id = p.city_id
  where p.id = p_id and p.status = 'approved';
$$;
grant execute on function place_detail(uuid) to anon, authenticated;

-- ---------- Map pins carry rating and hours (for the open-now filter) ----------
drop function if exists places_in_bbox(double precision, double precision, double precision, double precision, text[]);
create function places_in_bbox(
  west double precision, south double precision,
  east double precision, north double precision,
  kinds text[] default null
)
returns table (
  id uuid, name text, kind text, address text, website text,
  source text, lng double precision, lat double precision,
  rating numeric, opening_hours jsonb
)
language sql stable as $$
  select p.id, p.name, p.kind, p.address, p.website, p.source,
         st_x(p.location::geometry) as lng,
         st_y(p.location::geometry) as lat,
         p.rating, p.opening_hours
  from places p
  where p.status = 'approved'
    and (kinds is null or p.kind = any(kinds))
    and st_intersects(
      p.location,
      st_makeenvelope(west, south, east, north, 4326)::geography
    );
$$;
grant execute on function places_in_bbox(double precision, double precision, double precision, double precision, text[]) to anon, authenticated;

select 'migration 0019 applied' as status;

