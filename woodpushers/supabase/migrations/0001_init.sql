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
