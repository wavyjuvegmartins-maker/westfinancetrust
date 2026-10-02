-- =============================================================================
-- West Finance Trust: secure messages between customers and staff, and push
-- notifications for the installed app.
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- ------------------------------------------------------------- 1. messages
-- One conversation per customer. Staff all share it, so any of them can reply.
-- Rows are written only by the app's server (src/lib/messages/actions.ts),
-- which checks who is sending; nobody can write here from the browser.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  from_staff boolean not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- when the other side first saw it
  read_at timestamptz
);
create index messages_thread_idx on public.messages (customer_id, created_at desc);
create index messages_unread_for_staff_idx on public.messages (customer_id) where not from_staff and read_at is null;

alter table public.messages enable row level security;

-- Customers read their own conversation; staff read every conversation.
create policy "messages: own thread or staff" on public.messages
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_staff()));

revoke insert, update, delete on public.messages from anon, authenticated;
grant select on public.messages to authenticated;

-- New messages appear instantly in both apps (Realtime respects the policy above).
alter publication supabase_realtime add table public.messages;

-- ------------------------------------------- 2. "new message" notifications
-- A staff reply notifies the customer like any other alert. Its email only says
-- there's a message waiting: the text itself stays inside online banking.
alter table public.notifications drop constraint if exists notifications_topic_check;
alter table public.notifications
  add constraint notifications_topic_check
  check (topic in ('security', 'activity', 'low_balance', 'login', 'message'));

-- ----------------------------------------------------- 3. push notifications
-- One row per device that allowed notifications. The app server sends to these
-- with the VAPID keys and removes devices that have unsubscribed.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- Server only: no policies, so the browser can neither read nor write it.
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- Every notification is also pushed once, like the email outbox.
alter table public.notifications
  add column push_status text not null default 'pending'
    check (push_status in ('pending', 'sending', 'sent', 'skipped'));

-- Nothing from before push existed gets sent.
update public.notifications set push_status = 'skipped';

create index notifications_push_pending_idx on public.notifications (created_at)
  where push_status in ('pending', 'sending');

-- Check: both tables exist and nothing old is waiting to be pushed.
select
  (select count(*) from public.messages) as messages,
  (select count(*) from public.push_subscriptions) as devices,
  (select count(*) from public.notifications where push_status = 'pending') as pending_pushes;
