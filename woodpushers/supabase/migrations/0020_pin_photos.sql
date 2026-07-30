-- 0020: map pins carry the place photo for the bottom-sheet thumbnail.
-- Re-runnable. Requires 0019.

drop function if exists places_in_bbox(double precision, double precision, double precision, double precision, text[]);
create function places_in_bbox(
  west double precision, south double precision,
  east double precision, north double precision,
  kinds text[] default null
)
returns table (
  id uuid, name text, kind text, address text, website text,
  source text, lng double precision, lat double precision,
  rating numeric, opening_hours jsonb, photo_url text
)
language sql stable as $$
  select p.id, p.name, p.kind, p.address, p.website, p.source,
         st_x(p.location::geometry) as lng,
         st_y(p.location::geometry) as lat,
         p.rating, p.opening_hours, p.photo_url
  from places p
  where p.status = 'approved'
    and (kinds is null or p.kind = any(kinds))
    and st_intersects(
      p.location,
      st_makeenvelope(west, south, east, north, 4326)::geography
    );
$$;
grant execute on function places_in_bbox(double precision, double precision, double precision, double precision, text[]) to anon, authenticated;

select 'migration 0020 applied' as status;
