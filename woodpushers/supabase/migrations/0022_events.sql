-- 0022: per-city chess event calendar, auto-fed by the nightly research run.
-- Re-runnable. Requires 0001..0021.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  city_id bigint not null references cities(id),
  place_id uuid references places(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz,
  recurrence text,
  source text not null default 'claude_research',
  source_url text,
  status text not null default 'approved'
    check (status in ('approved','pending','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists events_city_idx on events (city_id, starts_at);
create unique index if not exists events_city_title_idx
  on events (city_id, lower(title));

alter table events enable row level security;
drop policy if exists events_public_read on events;
create policy events_public_read on events
  for select using (status = 'approved');
revoke all on events from public, anon, authenticated;
grant select (id, city_id, place_id, title, description, starts_at,
  recurrence, source_url, status) on events to anon, authenticated;

-- Scraper upsert: one row per (city, title), refreshed on every re-scrape.
drop function if exists upsert_scraped_event(bigint, uuid, text, text, timestamptz, text, text);
create function upsert_scraped_event(
  p_city_id bigint, p_place_id uuid, p_title text, p_description text,
  p_starts_at timestamptz, p_recurrence text, p_source_url text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  insert into events (city_id, place_id, title, description, starts_at, recurrence, source_url)
  values (p_city_id, p_place_id, p_title, p_description, p_starts_at, p_recurrence, p_source_url)
  on conflict (city_id, lower(title)) do update
    set description = coalesce(excluded.description, events.description),
        starts_at = coalesce(excluded.starts_at, events.starts_at),
        recurrence = coalesce(excluded.recurrence, events.recurrence),
        place_id = coalesce(excluded.place_id, events.place_id),
        source_url = coalesce(excluded.source_url, events.source_url),
        updated_at = now()
  returning id into eid;
  return eid;
end;
$$;
revoke execute on function upsert_scraped_event(bigint, uuid, text, text, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function upsert_scraped_event(bigint, uuid, text, text, timestamptz, text, text)
  to service_role;

-- City page calendar: upcoming dated events plus regular nights.
drop function if exists city_events(text);
create function city_events(p_slug text)
returns table (
  id uuid, title text, description text, starts_at timestamptz,
  recurrence text, source_url text, place_id uuid, place_name text
)
language sql stable as $$
  select e.id, e.title, e.description, e.starts_at, e.recurrence,
         e.source_url, e.place_id, p.name
  from events e
  join cities c on c.id = e.city_id
  left join places p on p.id = e.place_id
  where c.slug = p_slug and e.status = 'approved'
    and (e.starts_at is null or e.starts_at > now() - interval '1 day')
  order by e.starts_at asc nulls last, e.created_at desc
  limit 20;
$$;
grant execute on function city_events(text) to anon, authenticated;

-- places_for_dedupe now returns ids so events can link to their venue.
drop function if exists places_for_dedupe(bigint);
create function places_for_dedupe(p_city_id bigint)
returns table (id uuid, name text, website text, lng double precision, lat double precision)
language sql stable as $$
  select p.id, p.name, p.website,
         st_x(p.location::geometry) as lng,
         st_y(p.location::geometry) as lat
  from places p
  where p.city_id = p_city_id;
$$;
revoke execute on function places_for_dedupe(bigint) from public, anon, authenticated;
grant execute on function places_for_dedupe(bigint) to service_role;

select 'migration 0022 applied' as status;
