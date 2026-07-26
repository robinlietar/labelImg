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
