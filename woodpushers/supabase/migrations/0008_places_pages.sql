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

-- Public place detail with coordinates (approved only).
create or replace function place_detail(p_id uuid)
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

-- City centroid and metadata for the city page.
create or replace function city_detail(p_slug text)
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
