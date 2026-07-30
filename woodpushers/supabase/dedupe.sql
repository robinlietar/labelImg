-- Duplicate finder and remover. Two steps in one paste:
--   1) The first SELECT lists what will be merged, so the decision is visible.
--   2) The DO block merges each duplicate into its keeper and deletes it.
-- A duplicate = same city, and (identical name, ignoring case/accents-lite)
-- OR (names 60%+ similar AND pins within 150 m). The keeper is the best row:
-- approved beats pending, enriched beats not, higher confidence, then oldest.
-- Favorites, signals and events are re-pointed to the keeper first, so
-- nothing a user hearted disappears.

create extension if not exists pg_trgm;

-- ---------- 1) Preview ----------
with pairs as (
  select a.id as keep_id, a.name as keep_name,
         b.id as drop_id, b.name as drop_name,
         c.name as city
  from places a
  join places b on b.city_id = a.city_id and b.id > a.id
  left join cities c on c.id = a.city_id
  where a.status <> 'rejected' and b.status <> 'rejected'
    and (
      lower(a.name) = lower(b.name)
      or (
        similarity(lower(a.name), lower(b.name)) >= 0.6
        and st_dwithin(a.location, b.location, 150)
      )
    )
)
select city, keep_name, drop_name from pairs order by city, keep_name;

-- ---------- 2) Merge and delete ----------
do $$
declare
  pair record;
begin
  for pair in
    select
      -- Rank the two rows; the better one is the keeper.
      case when rank_a <= rank_b then id_a else id_b end as keep_id,
      case when rank_a <= rank_b then id_b else id_a end as drop_id
    from (
      select a.id as id_a, b.id as id_b,
        (case a.status when 'approved' then 0 else 1 end) * 1000
          + (case when a.google_place_id is null then 100 else 0 end)
          + (100 - coalesce(a.confidence, 0.5) * 100)::int as rank_a,
        (case b.status when 'approved' then 0 else 1 end) * 1000
          + (case when b.google_place_id is null then 100 else 0 end)
          + (100 - coalesce(b.confidence, 0.5) * 100)::int as rank_b
      from places a
      join places b on b.city_id = a.city_id and b.id > a.id
      where a.status <> 'rejected' and b.status <> 'rejected'
        and (
          lower(a.name) = lower(b.name)
          or (
            similarity(lower(a.name), lower(b.name)) >= 0.6
            and st_dwithin(a.location, b.location, 150)
          )
        )
    ) ranked
  loop
    -- A chain (A~B~C) can delete a row referenced by a later pair: skip those.
    if not exists (select 1 from places where id = pair.keep_id)
       or not exists (select 1 from places where id = pair.drop_id) then
      continue;
    end if;

    -- Re-point user data, ignoring conflicts where both rows were marked.
    update place_signals s set place_id = pair.keep_id
      where s.place_id = pair.drop_id
        and not exists (select 1 from place_signals k
          where k.place_id = pair.keep_id and k.profile_id = s.profile_id);
    delete from place_signals where place_id = pair.drop_id;

    update place_favorites f set place_id = pair.keep_id
      where f.place_id = pair.drop_id
        and not exists (select 1 from place_favorites k
          where k.place_id = pair.keep_id and k.user_id = f.user_id);
    delete from place_favorites where place_id = pair.drop_id;

    update events set place_id = pair.keep_id where place_id = pair.drop_id;
    update place_submissions set place_id = pair.keep_id where place_id = pair.drop_id;

    delete from places where id = pair.drop_id;
  end loop;
end;
$$;

select 'dedupe done' as status, count(*) as places_remaining from places;
