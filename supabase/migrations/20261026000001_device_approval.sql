-- =============================================================================
-- West Finance Trust: new devices need the bank's approval.
--
-- When a customer signs in from a browser they've never used AND an IP address
-- none of their approved devices has used, the right password isn't enough:
-- no session is created, the browser waits on a "waiting for authorization"
-- screen, and an admin confirms with the customer (e.g. a call to the number
-- on file) before approving or denying it. Only admins can see device IPs.
--
-- The app's server does all of this with the secret key (src/lib/auth/devices.ts);
-- nothing here is writable from the browser.
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- ------------------------------------------------- 1. what we know per device

alter table public.known_devices
  add column first_ip text,
  add column last_ip text,
  add column approved_by uuid references public.profiles (id) on delete set null,
  add column approved_at timestamptz;

-- ---------------------------------------------- 2. sign-ins waiting for staff

create table public.device_login_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  device_hash text not null,                            -- SHA-256 of the browser's device cookie
  token_hash text not null unique,                      -- SHA-256 of the waiting screen's own cookie
  ip text,
  user_agent text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'used', 'cancelled')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  deny_reason text check (char_length(deny_reason) <= 200),
  created_at timestamptz not null default now(),
  -- An unanswered request stops waiting after this; the customer logs in again.
  expires_at timestamptz not null default now() + interval '12 hours'
);
create index device_login_requests_pending_idx on public.device_login_requests (created_at) where status = 'pending';
create index device_login_requests_profile_idx on public.device_login_requests (profile_id, created_at desc);

-- ---------------------------------------------------- 3. admins only, read only

alter table public.device_login_requests enable row level security;

create policy "device requests: admins read" on public.device_login_requests
  for select to authenticated using ((select public.is_admin()));
create policy "known devices: admins read" on public.known_devices
  for select to authenticated using ((select public.is_admin()));

revoke all on public.device_login_requests from anon;
revoke insert, update, delete on public.device_login_requests, public.known_devices from authenticated;
grant select on public.device_login_requests, public.known_devices to authenticated;

-- The staff badge updates the moment a customer is waiting.
alter publication supabase_realtime add table public.device_login_requests;

-- Check: the table exists and nothing is waiting yet.
select count(*) as waiting_device_requests from public.device_login_requests where status = 'pending';
