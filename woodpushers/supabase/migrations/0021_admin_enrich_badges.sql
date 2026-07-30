-- 0021: admin_places exposes Google enrichment state for the admin UI.
-- Re-runnable. Requires 0019.

drop function if exists admin_places(text, boolean, int);
drop function if exists admin_places(text, boolean, int, text);
create function admin_places(
  q text, only_pending boolean, max_count int, p_status text default null
)
returns table (
  id uuid, name text, kind text, description text, address text,
  website text, opening_notes text, source text, source_url text,
  confidence numeric, status text, city_name text,
  lng double precision, lat double precision, created_at timestamptz,
  google_place_id text, rating numeric, rating_count int,
  photo_url text, google_refreshed_at timestamptz
)
language sql stable as $$
  select p.id, p.name, p.kind, p.description, p.address, p.website,
         p.opening_notes, p.source, p.source_url, p.confidence, p.status,
         c.name, st_x(p.location::geometry), st_y(p.location::geometry),
         p.created_at,
         p.google_place_id, p.rating, p.rating_count,
         p.photo_url, p.google_refreshed_at
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

select 'migration 0021 applied' as status;
