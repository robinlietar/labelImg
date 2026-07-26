-- Chat support: read tracking, conversation summaries, realtime. Idempotent.

-- Per-member read cursor for unread counts.
create table if not exists conversation_reads (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (conversation_id, profile_id)
);
alter table conversation_reads enable row level security;

drop policy if exists reads_own on conversation_reads;
create policy reads_own on conversation_reads
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Realtime broadcast for messages (RLS still filters what each client sees).
do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
end $$;

-- Conversation list for the current user: other member, last message, unread.
-- Drop first: later migrations change the return shape, and this bundle must
-- stay safe to re-run end to end.
drop function if exists my_conversations();
create function my_conversations()
returns table (
  conversation_id uuid, other_handle text, other_display_name text,
  last_body text, last_at timestamptz, unread int
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    op.handle,
    op.display_name,
    lm.body,
    lm.created_at,
    (
      select count(*)::int from messages m2
      where m2.conversation_id = c.id
        and m2.sender_id <> auth.uid()
        and m2.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz)
    ) as unread
  from conversation_members mine
  join conversations c on c.id = mine.conversation_id
  join conversation_members others
    on others.conversation_id = c.id and others.profile_id <> auth.uid()
  join profiles op on op.id = others.profile_id
  left join conversation_reads cr
    on cr.conversation_id = c.id and cr.profile_id = auth.uid()
  left join lateral (
    select body, created_at from messages m
    where m.conversation_id = c.id
    order by created_at desc limit 1
  ) lm on true
  where mine.profile_id = auth.uid()
  order by lm.created_at desc nulls last;
$$;

-- Mark a conversation read up to now.
create or replace function mark_read(p_conversation_id uuid)
returns void
language sql security definer set search_path = public as $$
  insert into conversation_reads (conversation_id, profile_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, profile_id)
    do update set last_read_at = now();
$$;

grant execute on function my_conversations() to authenticated;
grant execute on function mark_read(uuid) to authenticated;
