-- Correctness fixes for messaging RLS and conversation creation. Idempotent.
--
-- Bug 1: policies on conversation_members queried conversation_members inside
-- their own USING clause. Postgres raises "infinite recursion detected in
-- policy" at query time, which also broke messages and conversations reads
-- (their policies query conversation_members too) and Realtime delivery.
-- Fix: route membership checks through a security definer function.
--
-- Bug 2: the messages insert policy checked blocks via a subquery that runs
-- under the caller's RLS on blocks, which only exposes rows where
-- blocker = auth.uid(). A block in the other direction was invisible, so
-- "blocked either way" was not enforced. Same security definer treatment.
--
-- Bug 3: start_conversation used a window function inside HAVING, which is
-- invalid SQL and errors on first execution.

create or replace function is_conversation_member(
  p_conversation_id uuid, p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = p_conversation_id and profile_id = p_profile_id
  );
$$;

create or replace function is_blocked_pair(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

grant execute on function is_conversation_member(uuid, uuid) to authenticated;
grant execute on function is_blocked_pair(uuid, uuid) to authenticated;

-- Recreate the recursive/incomplete policies on top of the helpers.
drop policy if exists members_read on conversation_members;
create policy members_read on conversation_members
  for select using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists conversations_read_member on conversations;
create policy conversations_read_member on conversations
  for select using (is_conversation_member(id, auth.uid()));

drop policy if exists messages_read_member on messages;
create policy messages_read_member on messages
  for select using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists messages_insert_member on messages;
create policy messages_insert_member on messages
  for insert with check (
    sender_id = auth.uid()
    and is_conversation_member(conversation_id, auth.uid())
    and not exists (
      select 1 from conversation_members other
      where other.conversation_id = messages.conversation_id
        and other.profile_id <> auth.uid()
        and is_blocked_pair(auth.uid(), other.profile_id)
    )
  );

-- Fixed start_conversation: valid SQL for the existing-1:1 lookup.
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

  select count(*) into started_today
  from conversations c
  join conversation_members cm on cm.conversation_id = c.id
  where cm.profile_id = me and c.created_at >= now() - interval '24 hours';
  if started_today >= 10 then
    raise exception 'daily conversation limit reached';
  end if;

  insert into conversations default values returning id into conv;
  insert into conversation_members (conversation_id, profile_id)
    values (conv, me), (conv, other_profile);
  return conv;
end;
$$;

grant execute on function start_conversation(uuid) to authenticated;
