-- Track when linked-account ratings were last refreshed. Idempotent.
alter table profiles add column if not exists ratings_refreshed_at timestamptz;

-- Profiles with at least one linked account, oldest refresh first, for the
-- daily refresh cron.
create or replace function profiles_to_refresh(max_count int)
returns table (id uuid, lichess_username text, chesscom_username text, chesscom_verified boolean)
language sql stable as $$
  select p.id, p.lichess_username, p.chesscom_username, p.chesscom_verified
  from profiles p
  where p.lichess_username is not null or p.chesscom_username is not null
  order by p.ratings_refreshed_at asc nulls first
  limit max_count;
$$;
