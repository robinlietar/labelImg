-- 0024: mates (follow) between players. One-directional follow, mutuals
-- surfaced as "follows you back". Re-runnable. Requires 0010 (is_blocked_pair).

create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followed_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists follows_followed_idx on follows (followed_id);

alter table follows enable row level security;
drop policy if exists follows_own_select on follows;
create policy follows_own_select on follows
  for select using (follower_id = auth.uid() or followed_id = auth.uid());
drop policy if exists follows_own_insert on follows;
create policy follows_own_insert on follows
  for insert with check (
    follower_id = auth.uid()
    and not is_blocked_pair(follower_id, followed_id)
    and exists (select 1 from profiles p where p.id = followed_id)
  );
drop policy if exists follows_own_delete on follows;
create policy follows_own_delete on follows
  for delete using (follower_id = auth.uid());

revoke all on follows from public, anon, authenticated;
grant select, insert (follower_id, followed_id), delete on follows to authenticated;

-- Follow state and counts for a profile page. Definer so counts are real.
drop function if exists follow_info(uuid);
create function follow_info(p_id uuid)
returns table (followers int, following int, i_follow boolean, follows_me boolean)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from follows f where f.followed_id = p_id),
    (select count(*)::int from follows f where f.follower_id = p_id),
    exists (select 1 from follows f
            where f.follower_id = auth.uid() and f.followed_id = p_id),
    exists (select 1 from follows f
            where f.follower_id = p_id and f.followed_id = auth.uid());
$$;
grant execute on function follow_info(uuid) to anon, authenticated;

-- Everyone I follow, mutuals flagged, newest first.
drop function if exists my_mates();
create function my_mates()
returns table (
  id uuid, handle text, display_name text, avatar_url text,
  last_seen_at timestamptz, follows_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, p.display_name, p.avatar_url, p.last_seen_at,
         exists (select 1 from follows b
                 where b.follower_id = p.id and b.followed_id = auth.uid())
  from follows f
  join profiles p on p.id = f.followed_id
  where f.follower_id = auth.uid()
  order by f.created_at desc
  limit 200;
$$;
revoke execute on function my_mates() from public, anon;
grant execute on function my_mates() to authenticated;

select 'migration 0024 applied' as status;
