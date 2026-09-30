-- =============================================================================
-- West Finance Trust: email for notifications, security alerts and the waitlist
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- ----------------------------------------------- 1. notifications as an outbox
-- Every notification is also emailed once, subject to the customer's settings.
-- The app (src/lib/email/outbox.ts) claims pending rows and records the result.
--   topic: which setting decides the email. null means "work it out from kind":
--          security -> always sent, anything else -> account activity.
alter table public.notifications
  add column topic text check (topic in ('security', 'activity', 'low_balance', 'login')),
  add column email_status text not null default 'pending'
    check (email_status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  add column email_attempts smallint not null default 0,
  add column email_at timestamptz;

-- Nothing from before email existed gets sent.
update public.notifications set email_status = 'skipped', email_at = now();

create index notifications_email_pending_idx on public.notifications (created_at)
  where email_status in ('pending', 'sending');

-- ------------------------------------------------ 2. account activity setting
alter table public.user_settings
  add column activity_emails boolean not null default true;
grant update (activity_emails) on public.user_settings to authenticated;

-- ---------------------------------------------------------- 3. low balance
-- When a debit takes a checking account below $250, tell every holder who wants
-- low-balance alerts. Only on the way down, so it isn't repeated on every debit.
create or replace function public.notify_low_balance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_threshold constant numeric := 250;
begin
  if new.amount >= 0 or new.balance_after >= v_threshold or new.balance_after - new.amount < v_threshold then
    return new;
  end if;
  if not exists (select 1 from public.accounts a where a.id = new.account_id and a.type = 'checking') then
    return new;
  end if;
  insert into public.notifications (profile_id, kind, topic, title, body)
  select h.profile_id, 'info', 'low_balance', 'Low balance',
         format('Your %s balance is %s, below %s.',
                (select a.name from public.accounts a where a.id = new.account_id),
                to_char(new.balance_after, 'FM$999,999,990.00'),
                to_char(v_threshold, 'FM$999,990'))
  from public.account_holders h
  left join public.user_settings s on s.profile_id = h.profile_id
  where h.account_id = new.account_id
    and coalesce(s.low_balance_alerts, true);
  return new;
end;
$$;

create trigger transactions_low_balance
after insert on public.transactions
for each row execute function public.notify_low_balance();
revoke execute on function public.notify_low_balance() from public, anon, authenticated;

-- --------------------------------------------------------- 4. known devices
-- A random ID in a long-lived cookie marks a browser that has signed in before.
-- Only its SHA-256 is stored. A sign-in from an unknown browser is a "new sign-in".
create table public.known_devices (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  device_hash text not null,
  user_agent text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (profile_id, device_hash)
);
-- Server only (secret key); no policies, so signed-in users can't read or write it.
alter table public.known_devices enable row level security;
revoke all on public.known_devices from anon, authenticated;

-- ------------------------------------------------------------- 5. waitlist
-- When loans open, staff email the waitlist once; this records who's been told.
alter table public.loan_waitlist
  add column notified_at timestamptz;

-- Staff see the waitlist in the admin area (sending the email uses the secret key).
create policy "waitlist: staff read" on public.loan_waitlist
  for select to authenticated using (public.is_staff());
