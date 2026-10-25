-- =============================================================================
-- West Finance Trust: crypto balances (BTC, USDT, USDC and XRP).
--
-- How it works (and what this enforces):
--   * Each customer has one wallet per coin, holding a balance in that coin.
--   * Admins set the address a customer sends coins to (deposit) and the
--     address the bank pays their withdrawals out to. Customers can't change
--     either, the same way payees are added only by staff.
--   * A customer tells us they've sent a deposit; it waits as pending until an
--     admin checks it arrived and approves it. No transaction hash is needed.
--   * A customer's withdrawal request holds the coins straight away, so they
--     can't be spent twice. An admin approves it once the coins are sent, or
--     declines it and the coins go back to the balance.
--   * Admins can also credit or debit a wallet directly, like a cash deposit.
--   * Balances never change directly: only through crypto_move below.
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- ---------------------------------------------------------------- 1. types

create type public.crypto_asset as enum ('btc', 'usdt', 'usdc', 'xrp');
create type public.crypto_kind as enum ('deposit', 'withdrawal');
create type public.crypto_status as enum ('pending', 'completed', 'declined');

-- ----------------------------------------------------------- 2. the tables

-- One row per customer per coin, created the first time an admin sets an
-- address or money moves. Network codes are checked in crypto_address_problem.
create table public.crypto_wallets (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  asset public.crypto_asset not null,
  balance numeric(24, 8) not null default 0 check (balance >= 0),
  deposit_address text,
  deposit_network text,
  deposit_tag text,                                     -- XRP destination tag
  withdrawal_address text,
  withdrawal_network text,
  withdrawal_tag text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  primary key (profile_id, asset),
  check ((deposit_address is null) = (deposit_network is null)),
  check ((withdrawal_address is null) = (withdrawal_network is null))
);

-- The crypto ledger. Amounts are always positive; `kind` says which way.
create table public.crypto_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  asset public.crypto_asset not null,
  kind public.crypto_kind not null,
  status public.crypto_status not null default 'pending',
  amount numeric(24, 8) not null check (amount > 0),
  balance_after numeric(24, 8),                         -- set once the balance changes
  -- The address the coins went to (withdrawal) or were sent to (deposit), as it was at the time.
  address text,
  network text,
  tag text,
  description text not null,
  note text check (char_length(note) <= 60),           -- the customer's own note
  reference text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  requested_by uuid references public.profiles (id),    -- the customer, or the admin who posted it
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  decline_reason text check (char_length(decline_reason) <= 200),
  created_at timestamptz not null default now()
);
create index crypto_transactions_profile_idx on public.crypto_transactions (profile_id, created_at desc);
create index crypto_transactions_pending_idx on public.crypto_transactions (created_at) where status = 'pending';

-- ------------------------------------------------------------ 3. helpers

create or replace function public.crypto_symbol(p_asset public.crypto_asset)
returns text language sql immutable set search_path = '' as $$
  select upper(p_asset::text);
$$;

-- BTC moves in satoshis (8 places); the others in millionths.
create or replace function public.crypto_decimals(p_asset public.crypto_asset)
returns int language sql immutable set search_path = '' as $$
  select case p_asset when 'btc' then 8 else 6 end;
$$;

-- "0.015 BTC", for notifications.
create or replace function public.crypto_amount_text(p_amount numeric, p_asset public.crypto_asset)
returns text language sql immutable set search_path = '' as $$
  select trim_scale(p_amount)::text || ' ' || public.crypto_symbol(p_asset);
$$;

-- What's wrong with an address, or null if it looks right for the coin and network.
-- Mirrors cryptoAddressProblem in src/lib/crypto.ts.
create or replace function public.crypto_address_problem(
  p_asset public.crypto_asset,
  p_network text,
  p_address text,
  p_tag text
)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_pattern text;
begin
  if not (
    (p_asset = 'btc' and p_network = 'bitcoin') or
    (p_asset = 'xrp' and p_network = 'xrpl') or
    (p_asset = 'usdt' and p_network in ('ethereum', 'tron', 'solana', 'bsc')) or
    (p_asset = 'usdc' and p_network in ('ethereum', 'solana', 'polygon', 'base'))
  ) then
    return format('%s can''t be sent on that network.', public.crypto_symbol(p_asset));
  end if;

  v_pattern := case p_network
    when 'bitcoin' then '^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$'
    when 'xrpl' then '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
    when 'tron' then '^T[1-9A-HJ-NP-Za-km-z]{33}$'
    when 'solana' then '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    else '^0x[0-9a-fA-F]{40}$'                          -- ethereum, bsc, polygon, base
  end;
  if p_address is null or p_address !~ v_pattern then
    return 'That address isn''t valid for the network chosen. Check it character by character.';
  end if;

  if p_tag is not null then
    if p_network <> 'xrpl' then
      return 'Only XRP addresses take a destination tag.';
    end if;
    if p_tag !~ '^[0-9]{1,10}$' or p_tag::bigint > 4294967295 then
      return 'XRP destination tags are a number up to 4294967295.';
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.is_active_customer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'customer' and status = 'active'
  );
$$;

-- -------------------------------------------- 4. the only way balances move

-- Locks the wallet (making it if needed), checks funds and applies the change.
-- Internal: not callable from the app directly.
create or replace function public.crypto_move(p_profile uuid, p_asset public.crypto_asset, p_delta numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare
  v_balance numeric(24, 8);
begin
  insert into public.crypto_wallets (profile_id, asset) values (p_profile, p_asset)
  on conflict do nothing;

  select balance into v_balance
  from public.crypto_wallets
  where profile_id = p_profile and asset = p_asset
  for update;

  if v_balance + p_delta < 0 then
    raise exception 'Not enough % in the wallet.', public.crypto_symbol(p_asset) using errcode = 'P0001';
  end if;

  update public.crypto_wallets set balance = balance + p_delta
  where profile_id = p_profile and asset = p_asset
  returning balance into v_balance;
  return v_balance;
end;
$$;

-- Checks an amount is above zero and has no more decimal places than the coin allows.
create or replace function public.crypto_check_amount(p_asset public.crypto_asset, p_amount numeric)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above zero.' using errcode = '22023';
  end if;
  if p_amount <> round(p_amount, public.crypto_decimals(p_asset)) then
    raise exception '% amounts have up to % decimal places.', public.crypto_symbol(p_asset), public.crypto_decimals(p_asset)
      using errcode = '22023';
  end if;
  if p_amount > 100000000 then
    raise exception 'That amount is too large.' using errcode = '22023';
  end if;
end;
$$;

-- ------------------------------------------------- 5. admin: the addresses

-- Sets both addresses for one coin. Pass nulls to clear an address.
create or replace function public.admin_set_crypto_wallet(
  p_profile uuid,
  p_asset public.crypto_asset,
  p_deposit_address text,
  p_deposit_network text,
  p_deposit_tag text,
  p_withdrawal_address text,
  p_withdrawal_network text,
  p_withdrawal_tag text,
  p_added_via text default null                         -- how the customer asked: phone or branch
)
returns public.crypto_wallets language plpgsql security definer set search_path = '' as $$
declare
  v_old public.crypto_wallets;
  v_new public.crypto_wallets;
  v_problem text;
  v_symbol text := public.crypto_symbol(p_asset);
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can set crypto addresses.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile and role = 'customer') then
    raise exception 'Customer not found.' using errcode = 'P0002';
  end if;

  p_deposit_address := nullif(btrim(p_deposit_address), '');
  p_deposit_tag := nullif(btrim(p_deposit_tag), '');
  p_withdrawal_address := nullif(btrim(p_withdrawal_address), '');
  p_withdrawal_tag := nullif(btrim(p_withdrawal_tag), '');

  if p_deposit_address is not null then
    v_problem := public.crypto_address_problem(p_asset, p_deposit_network, p_deposit_address, p_deposit_tag);
    if v_problem is not null then
      raise exception 'Deposit address: %', v_problem using errcode = '22023';
    end if;
  end if;
  if p_withdrawal_address is not null then
    v_problem := public.crypto_address_problem(p_asset, p_withdrawal_network, p_withdrawal_address, p_withdrawal_tag);
    if v_problem is not null then
      raise exception 'Withdrawal address: %', v_problem using errcode = '22023';
    end if;
  end if;

  insert into public.crypto_wallets (profile_id, asset) values (p_profile, p_asset)
  on conflict do nothing;
  select * into v_old from public.crypto_wallets where profile_id = p_profile and asset = p_asset for update;

  update public.crypto_wallets set
    deposit_address = p_deposit_address,
    deposit_network = case when p_deposit_address is null then null else p_deposit_network end,
    deposit_tag = case when p_deposit_address is null then null else p_deposit_tag end,
    withdrawal_address = p_withdrawal_address,
    withdrawal_network = case when p_withdrawal_address is null then null else p_withdrawal_network end,
    withdrawal_tag = case when p_withdrawal_address is null then null else p_withdrawal_tag end,
    updated_by = auth.uid(),
    updated_at = now()
  where profile_id = p_profile and asset = p_asset
  returning * into v_new;

  -- Tell the customer, so an address changed by someone impersonating them gets noticed fast.
  if v_new.withdrawal_address is distinct from v_old.withdrawal_address
     or v_new.withdrawal_network is distinct from v_old.withdrawal_network
     or v_new.withdrawal_tag is distinct from v_old.withdrawal_tag then
    insert into public.notifications (profile_id, kind, title, body)
    values (p_profile, 'security',
            format('%s withdrawal address %s', v_symbol,
                   case when v_new.withdrawal_address is null then 'removed' when v_old.withdrawal_address is null then 'added' else 'changed' end),
            case when v_new.withdrawal_address is null
              then format('You can''t withdraw %s until we add an address again.', v_symbol)
              else format('%s withdrawals now go to the address ending %s. If you didn''t ask for this, call us straight away.',
                          v_symbol, right(v_new.withdrawal_address, 6))
            end);
  end if;
  if v_new.deposit_address is distinct from v_old.deposit_address
     or v_new.deposit_network is distinct from v_old.deposit_network
     or v_new.deposit_tag is distinct from v_old.deposit_tag then
    insert into public.notifications (profile_id, kind, title, body)
    values (p_profile, 'info',
            format('%s deposit address %s', v_symbol,
                   case when v_new.deposit_address is null then 'removed' when v_old.deposit_address is null then 'ready' else 'updated' end),
            case when v_new.deposit_address is null
              then format('Don''t send %s to your old deposit address. Call us before sending any more.', v_symbol)
              when v_old.deposit_address is null
              then format('You can now deposit %s. Find your address in online banking, under Crypto.', v_symbol)
              else format('Your %s deposit address has changed. Copy it fresh from online banking each time you send.', v_symbol)
            end);
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_crypto_wallet', 'profile', p_profile,
          jsonb_build_object('asset', p_asset)
          || jsonb_strip_nulls(jsonb_build_object(
               'deposit_address', v_new.deposit_address, 'deposit_network', v_new.deposit_network, 'deposit_tag', v_new.deposit_tag,
               'withdrawal_address', v_new.withdrawal_address, 'withdrawal_network', v_new.withdrawal_network, 'withdrawal_tag', v_new.withdrawal_tag,
               'previous_withdrawal_address', v_old.withdrawal_address, 'added_via', p_added_via)));
  return v_new;
end;
$$;

-- ---------------------------------------------- 6. customer: ask to move coins

-- "I've sent it": waits for an admin to check the coins arrived.
create or replace function public.crypto_request_deposit(p_asset public.crypto_asset, p_amount numeric, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_wallet public.crypto_wallets;
  v_id uuid;
begin
  if not public.is_active_customer() then
    raise exception 'Only customers can do that.' using errcode = '42501';
  end if;
  perform public.crypto_check_amount(p_asset, p_amount);

  select * into v_wallet from public.crypto_wallets where profile_id = auth.uid() and asset = p_asset;
  if v_wallet.deposit_address is null then
    raise exception 'You don''t have a % deposit address yet. Call us and we''ll set one up.', public.crypto_symbol(p_asset)
      using errcode = 'P0002';
  end if;
  if (select count(*) from public.crypto_transactions
      where profile_id = auth.uid() and kind = 'deposit' and status = 'pending') >= 5 then
    raise exception 'You have 5 deposits waiting to be checked. We''ll get to them soon.' using errcode = 'P0001';
  end if;

  insert into public.crypto_transactions
    (profile_id, asset, kind, amount, address, network, tag, description, note, requested_by)
  values
    (auth.uid(), p_asset, 'deposit', p_amount, v_wallet.deposit_address, v_wallet.deposit_network, v_wallet.deposit_tag,
     public.crypto_symbol(p_asset) || ' deposit', nullif(btrim(p_note), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Holds the coins now; an admin sends them and approves, or declines and they come back.
create or replace function public.crypto_request_withdrawal(p_asset public.crypto_asset, p_amount numeric, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_wallet public.crypto_wallets;
  v_balance numeric(24, 8);
  v_id uuid;
begin
  if not public.is_active_customer() then
    raise exception 'Only customers can do that.' using errcode = '42501';
  end if;
  perform public.crypto_check_amount(p_asset, p_amount);

  select * into v_wallet from public.crypto_wallets where profile_id = auth.uid() and asset = p_asset;
  if v_wallet.withdrawal_address is null then
    raise exception 'You don''t have a % withdrawal address yet. Call us and we''ll add one.', public.crypto_symbol(p_asset)
      using errcode = 'P0002';
  end if;

  v_balance := public.crypto_move(auth.uid(), p_asset, -p_amount);

  insert into public.crypto_transactions
    (profile_id, asset, kind, amount, balance_after, address, network, tag, description, note, requested_by)
  values
    (auth.uid(), p_asset, 'withdrawal', p_amount, v_balance, v_wallet.withdrawal_address, v_wallet.withdrawal_network,
     v_wallet.withdrawal_tag, public.crypto_symbol(p_asset) || ' withdrawal', nullif(btrim(p_note), ''), auth.uid())
  returning id into v_id;

  -- Emailed as a security alert, so a withdrawal someone else started gets noticed.
  insert into public.notifications (profile_id, kind, title, body)
  values (auth.uid(), 'security', 'Crypto withdrawal requested',
          format('%s to the address ending %s. It''s on hold until our team sends it. If this wasn''t you, call us straight away.',
                 public.crypto_amount_text(p_amount, p_asset), right(v_wallet.withdrawal_address, 6)));
  return v_id;
end;
$$;

-- -------------------------------------------------- 7. admin: approve, decline

create or replace function public.admin_review_crypto(p_id uuid, p_approve boolean, p_reason text default null)
returns public.crypto_transactions language plpgsql security definer set search_path = '' as $$
declare
  v_txn public.crypto_transactions;
  v_balance numeric(24, 8);
  v_amount text;
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can approve crypto.' using errcode = '42501';
  end if;
  p_reason := nullif(btrim(p_reason), '');
  if not p_approve and p_reason is null then
    raise exception 'Give the customer a reason for declining.' using errcode = '22023';
  end if;

  select * into v_txn from public.crypto_transactions where id = p_id for update;
  if not found then
    raise exception 'That request doesn''t exist.' using errcode = 'P0002';
  end if;
  if v_txn.status <> 'pending' then
    raise exception 'That request has already been %.', case v_txn.status when 'completed' then 'approved' else 'declined' end
      using errcode = 'P0001';
  end if;

  v_amount := public.crypto_amount_text(v_txn.amount, v_txn.asset);
  if v_txn.kind = 'deposit' then
    if p_approve then
      v_balance := public.crypto_move(v_txn.profile_id, v_txn.asset, v_txn.amount);
    end if;
  elsif not p_approve then
    v_balance := public.crypto_move(v_txn.profile_id, v_txn.asset, v_txn.amount); -- give back the held coins
  end if;

  update public.crypto_transactions set
    status = case when p_approve then 'completed'::public.crypto_status else 'declined'::public.crypto_status end,
    balance_after = case when v_txn.kind = 'deposit' and p_approve then v_balance else balance_after end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decline_reason = case when p_approve then null else p_reason end
  where id = p_id
  returning * into v_txn;

  insert into public.notifications (profile_id, kind, title, body)
  values (v_txn.profile_id,
          case when v_txn.kind = 'deposit' and p_approve then 'deposit'::public.notice_kind
               when p_approve then 'payment'::public.notice_kind
               else 'info'::public.notice_kind end,
          case when v_txn.kind = 'deposit'
               then case when p_approve then 'Crypto deposit received' else 'Crypto deposit not received' end
               else case when p_approve then 'Crypto withdrawal sent' else 'Crypto withdrawal declined' end end,
          case when v_txn.kind = 'deposit' and p_approve
                 then format('%s added to your wallet.', v_amount)
               when v_txn.kind = 'deposit'
                 then format('We couldn''t confirm your %s deposit. %s', v_amount, p_reason)
               when p_approve
                 then format('%s sent to the address ending %s.', v_amount, right(v_txn.address, 6))
               else format('Your %s withdrawal wasn''t sent and is back in your wallet. %s', v_amount, p_reason) end);

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_approve then 'approve_crypto' else 'decline_crypto' end, 'profile', v_txn.profile_id,
          jsonb_build_object('transaction_id', v_txn.id, 'kind', v_txn.kind, 'asset', v_txn.asset, 'amount', v_txn.amount)
          || jsonb_strip_nulls(jsonb_build_object('address', v_txn.address, 'reason', p_reason)));
  return v_txn;
end;
$$;

-- ---------------------------------------------- 8. admin: credit or debit now

-- Like a cash deposit or withdrawal: done at once, no approval step.
create or replace function public.admin_post_crypto(
  p_profile uuid,
  p_asset public.crypto_asset,
  p_kind public.crypto_kind,
  p_amount numeric,
  p_description text
)
returns public.crypto_transactions language plpgsql security definer set search_path = '' as $$
declare
  v_txn public.crypto_transactions;
  v_balance numeric(24, 8);
  v_amount text := public.crypto_amount_text(p_amount, p_asset);
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can post crypto.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile and role = 'customer') then
    raise exception 'Customer not found.' using errcode = 'P0002';
  end if;
  perform public.crypto_check_amount(p_asset, p_amount);
  p_description := coalesce(nullif(btrim(p_description), ''), public.crypto_symbol(p_asset) || ' ' || p_kind::text);
  if char_length(p_description) > 80 then
    raise exception 'Keep the description under 80 characters.' using errcode = '22023';
  end if;

  v_balance := public.crypto_move(p_profile, p_asset, case when p_kind = 'deposit' then p_amount else -p_amount end);

  insert into public.crypto_transactions
    (profile_id, asset, kind, status, amount, balance_after, description, requested_by, reviewed_by, reviewed_at)
  values
    (p_profile, p_asset, p_kind, 'completed', p_amount, v_balance, p_description, auth.uid(), auth.uid(), now())
  returning * into v_txn;

  insert into public.notifications (profile_id, kind, title, body)
  values (p_profile,
          case when p_kind = 'deposit' then 'deposit'::public.notice_kind else 'payment'::public.notice_kind end,
          case when p_kind = 'deposit' then 'Crypto deposit received' else 'Crypto withdrawal made' end,
          format('%s %s. %s', v_amount, case when p_kind = 'deposit' then 'in' else 'out' end, p_description));

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'post_crypto', 'profile', p_profile,
          jsonb_build_object('transaction_id', v_txn.id, 'kind', p_kind, 'asset', p_asset, 'amount', p_amount, 'description', p_description));
  return v_txn;
end;
$$;

-- ------------------------------------------------ 9. row level security

alter table public.crypto_wallets enable row level security;
alter table public.crypto_transactions enable row level security;

create policy "crypto wallets: own, staff all" on public.crypto_wallets
  for select to authenticated using (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy "crypto transactions: own, staff all" on public.crypto_transactions
  for select to authenticated using (profile_id = (select auth.uid()) or (select public.is_staff()));

-- Nobody writes these from the browser: only the functions above.
revoke all on public.crypto_wallets, public.crypto_transactions from anon;
revoke insert, update, delete on public.crypto_wallets, public.crypto_transactions from authenticated;
grant select on public.crypto_wallets, public.crypto_transactions to authenticated;

-- ------------------------------------------------------- 10. privileges

revoke execute on function
  public.crypto_symbol(public.crypto_asset),
  public.crypto_decimals(public.crypto_asset),
  public.crypto_amount_text(numeric, public.crypto_asset),
  public.crypto_address_problem(public.crypto_asset, text, text, text),
  public.is_active_customer(),
  public.crypto_move(uuid, public.crypto_asset, numeric),
  public.crypto_check_amount(public.crypto_asset, numeric),
  public.admin_set_crypto_wallet(uuid, public.crypto_asset, text, text, text, text, text, text, text),
  public.crypto_request_deposit(public.crypto_asset, numeric, text),
  public.crypto_request_withdrawal(public.crypto_asset, numeric, text),
  public.admin_review_crypto(uuid, boolean, text),
  public.admin_post_crypto(uuid, public.crypto_asset, public.crypto_kind, numeric, text)
from public, anon;

revoke execute on function public.crypto_move(uuid, public.crypto_asset, numeric) from authenticated;

grant execute on function
  public.admin_set_crypto_wallet(uuid, public.crypto_asset, text, text, text, text, text, text, text),
  public.crypto_request_deposit(public.crypto_asset, numeric, text),
  public.crypto_request_withdrawal(public.crypto_asset, numeric, text),
  public.admin_review_crypto(uuid, boolean, text),
  public.admin_post_crypto(uuid, public.crypto_asset, public.crypto_kind, numeric, text)
to authenticated, service_role;

-- ------------------------------------------------------ 11. live updates

-- The customer's wallet page and the staff approval queue update as things change.
alter publication supabase_realtime add table public.crypto_wallets, public.crypto_transactions;

-- Check: both tables exist and are empty.
select
  (select count(*) from public.crypto_wallets) as wallets,
  (select count(*) from public.crypto_transactions) as crypto_transactions;
