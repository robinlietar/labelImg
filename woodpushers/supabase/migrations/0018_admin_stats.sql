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
