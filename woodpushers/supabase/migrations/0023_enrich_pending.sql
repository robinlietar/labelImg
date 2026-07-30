-- 0023: enrichment also covers the pending review queue. Reviewing a place
-- with its Google rating, exact pin and photo already filled is far easier.
-- Re-runnable. Requires 0019.

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
  where p.status in ('approved', 'pending')
    and (p.google_refreshed_at is null or p.google_refreshed_at < p_stale_before)
  order by p.google_refreshed_at asc nulls first, p.created_at asc
  limit p_limit;
$$;
revoke execute on function places_to_enrich(timestamptz, int) from public, anon, authenticated;
grant execute on function places_to_enrich(timestamptz, int) to service_role;

select 'migration 0023 applied' as status;
