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
