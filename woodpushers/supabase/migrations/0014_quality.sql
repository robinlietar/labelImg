-- Quality fixes. Idempotent.
--
-- 1) The 10-conversations-per-day cap counted every conversation the caller
--    is a member of, so ten INBOUND chats blocked you from starting any.
--    Track who started each conversation and count only those.
-- 2) touch_presence: enforce the 5-minute throttle server-side too.

alter table conversations add column if not exists created_by uuid references profiles(id);

create or replace function start_conversation(other_profile uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  conv uuid;
  started_today int;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = other_profile then raise exception 'cannot message yourself'; end if;

  if is_blocked_pair(me, other_profile) then
    raise exception 'blocked';
  end if;

  select cm.conversation_id into conv
  from conversation_members cm
  join conversation_members cm2
    on cm2.conversation_id = cm.conversation_id
   and cm2.profile_id = other_profile
  where cm.profile_id = me
    and (
      select count(*) from conversation_members x
      where x.conversation_id = cm.conversation_id
    ) = 2
  limit 1;

  if conv is not null then
    return conv;
  end if;

  -- Cap only conversations this user STARTED in the last 24 hours.
  select count(*) into started_today
  from conversations c
  where c.created_by = me and c.created_at >= now() - interval '24 hours';
  if started_today >= 10 then
    raise exception 'daily conversation limit reached';
  end if;

  insert into conversations (created_by) values (me) returning id into conv;
  insert into conversation_members (conversation_id, profile_id)
    values (conv, me), (conv, other_profile);
  return conv;
end;
$$;
grant execute on function start_conversation(uuid) to authenticated;

create or replace function touch_presence()
returns void language sql security definer set search_path = public as $$
  update profiles set last_seen_at = now()
  where id = auth.uid()
    and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');
$$;
grant execute on function touch_presence() to authenticated;
