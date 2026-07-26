-- Row Level Security and privacy functions.
-- Principle: approved places are public. Profiles are visible when the owner
-- allows it, but raw coordinates are NEVER exposed: clients read player data
-- through views/RPCs that return only distance bands.

alter table cities enable row level security;
alter table places enable row level security;
alter table place_submissions enable row level security;
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table city_chats enable row level security;
alter table city_chat_requests enable row level security;
alter table scrape_runs enable row level security;

-- Cities: public read.
create policy cities_read on cities for select using (true);

-- Places: only approved rows are publicly readable. All writes go through the
-- service role (which bypasses RLS), so there are no write policies here.
create policy places_read_approved on places
  for select using (status = 'approved');

-- City chats: public read. Edited by admins via service role.
create policy city_chats_read on city_chats for select using (true);

-- City chat requests: a logged-in user can record and see their own demand.
create policy city_chat_requests_insert on city_chat_requests
  for insert with check (auth.uid() = requested_by);
create policy city_chat_requests_read_own on city_chat_requests
  for select using (auth.uid() = requested_by);

-- Submissions: authors can create and read their own.
create policy submissions_insert on place_submissions
  for insert with check (auth.uid() = submitted_by);
create policy submissions_read_own on place_submissions
  for select using (auth.uid() = submitted_by);

-- Profiles ---------------------------------------------------------------
-- Row visibility: your own row, or any row the owner marked visible.
create policy profiles_read on profiles
  for select using (visible = true or id = auth.uid());
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());

-- Column-level guard: raw location is never selectable by clients, even on a
-- direct `select *`. Distance is only ever returned by the RPCs below.
revoke select (location) on profiles from anon, authenticated;

-- Messaging --------------------------------------------------------------
create policy conversations_read_member on conversations
  for select using (
    exists (
      select 1 from conversation_members m
      where m.conversation_id = conversations.id and m.profile_id = auth.uid()
    )
  );

create policy members_read on conversation_members
  for select using (
    exists (
      select 1 from conversation_members m
      where m.conversation_id = conversation_members.conversation_id
        and m.profile_id = auth.uid()
    )
  );

create policy messages_read_member on messages
  for select using (
    exists (
      select 1 from conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.profile_id = auth.uid()
    )
  );

-- Insert a message only if you are a member of the conversation, you are the
-- sender, and no block exists in either direction with any other member.
create policy messages_insert_member on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.profile_id = auth.uid()
    )
    and not exists (
      select 1
      from conversation_members other
      join blocks b
        on (b.blocker = auth.uid() and b.blocked = other.profile_id)
        or (b.blocker = other.profile_id and b.blocked = auth.uid())
      where other.conversation_id = messages.conversation_id
        and other.profile_id <> auth.uid()
    )
  );

-- Blocks and reports: a user manages their own.
create policy blocks_all_own on blocks
  for all using (blocker = auth.uid()) with check (blocker = auth.uid());
create policy reports_insert_own on reports
  for insert with check (reporter = auth.uid());

-- Distance banding -------------------------------------------------------
-- Coarse label only. Exact metres never leave the database.
create or replace function distance_band(meters double precision)
returns text language sql immutable as $$
  select case
    when meters is null then 'unknown'
    when meters < 1000 then '< 1 km'
    when meters < 2000 then '~2 km'
    when meters < 5000 then '~5 km'
    when meters < 10000 then '~10 km'
    when meters < 25000 then '~25 km'
    else 'same region'
  end;
$$;
