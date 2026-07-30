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
