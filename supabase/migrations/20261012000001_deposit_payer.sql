-- =============================================================================
-- West Finance Trust: who a deposit came from.
--
-- When an admin posts a deposit they can now record the person or organization
-- that paid it in and the date they sent it. The customer sees both in their
-- transaction history and in the "Deposit received" alert.
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- ------------------------------------------------------------ 1. the columns

alter table public.transactions
  add column payer_name text check (char_length(btrim(payer_name)) between 2 and 80),
  add column payer_type text check (payer_type in ('person', 'organization')),
  add column paid_on date,                                -- when the payer sent it
  add constraint transactions_payer_type_with_name check ((payer_name is null) = (payer_type is null));

-- ------------------------------------- 2. post_transaction takes the payer too

-- Same as before plus three optional trailing arguments, so every existing
-- caller keeps working. The payer has to be on the row when it's inserted so
-- the notification trigger below can mention it.
drop function public.post_transaction(uuid, public.txn_type, numeric, text, text, text, uuid, public.txn_status);

create function public.post_transaction(
  p_account uuid,
  p_type public.txn_type,
  p_amount numeric,
  p_description text,
  p_category text default null,
  p_note text default null,
  p_counterparty uuid default null,
  p_status public.txn_status default 'posted',
  p_payer_name text default null,
  p_payer_type text default null,
  p_paid_on date default null
)
returns public.transactions language plpgsql security definer set search_path = '' as $$
declare
  v_balance numeric(14, 2);
  v_txn public.transactions;
begin
  select balance into v_balance
  from public.accounts
  where id = p_account and status = 'active'
  for update;

  if not found then
    raise exception 'That account doesn''t exist or isn''t active.' using errcode = 'P0002';
  end if;
  if v_balance + p_amount < 0 then
    raise exception 'Not enough money in the account.' using errcode = 'P0001';
  end if;

  update public.accounts set balance = balance + round(p_amount, 2)
  where id = p_account
  returning balance into v_balance;

  insert into public.transactions
    (account_id, type, status, amount, balance_after, description, category, note,
     counterparty_account_id, created_by, posted_at, payer_name, payer_type, paid_on)
  values
    (p_account, p_type, p_status, round(p_amount, 2), v_balance, p_description, p_category, p_note,
     p_counterparty, auth.uid(), case when p_status = 'posted' then now() end,
     nullif(btrim(p_payer_name), ''), p_payer_type, p_paid_on)
  returning * into v_txn;

  return v_txn;
end;
$$;

revoke execute on function public.post_transaction(uuid, public.txn_type, numeric, text, text, text, uuid, public.txn_status, text, text, date)
  from public, anon, authenticated;

-- ------------------------------------------- 3. the alert names the payer

create or replace function public.notify_account_holders()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type in ('transfer_in', 'transfer_out') then
    return new; -- the customer made these themselves
  end if;
  insert into public.notifications (profile_id, kind, title, body)
  select h.profile_id,
         case when new.amount > 0 then 'deposit'::public.notice_kind else 'payment'::public.notice_kind end,
         case new.type
           when 'deposit' then 'Deposit received'
           when 'withdrawal' then 'Withdrawal made'
           when 'bill' then 'Bill paid'
           when 'p2p' then 'Payment sent'
           when 'interest' then 'Interest paid'
           else 'Account activity'
         end,
         format('%s %s. %s', to_char(abs(new.amount), 'FM$999,999,990.00'),
                case when new.amount > 0 then 'in' else 'out' end, new.description)
           || case when new.payer_name is not null then format(' From %s.', new.payer_name) else '' end
  from public.account_holders h
  where h.account_id = new.account_id;
  return new;
end;
$$;

-- ------------------------------------------------ 4. admin_deposit with payer

drop function public.admin_deposit(uuid, numeric, text);

create function public.admin_deposit(
  p_account uuid,
  p_amount numeric,
  p_description text default 'Cash deposit at branch',
  p_payer_name text default null,
  p_payer_type text default null,
  p_paid_on date default null
)
returns public.transactions language plpgsql security definer set search_path = '' as $$
declare v_txn public.transactions;
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can post deposits.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'The deposit amount must be above zero.' using errcode = '22023';
  end if;
  if nullif(btrim(p_payer_name), '') is not null and p_payer_type is null then
    raise exception 'Say whether the payer is a person or an organization.' using errcode = '22023';
  end if;
  -- A day of slack covers staff in time zones ahead of the database.
  if p_paid_on is not null and p_paid_on > current_date + 1 then
    raise exception 'The date sent can''t be in the future.' using errcode = '22023';
  end if;

  v_txn := public.post_transaction(
    p_account, 'deposit', p_amount, p_description, 'income', null, null, 'posted',
    p_payer_name, case when nullif(btrim(p_payer_name), '') is null then null else p_payer_type end, p_paid_on
  );

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'deposit', 'account', p_account,
          jsonb_build_object('amount', round(p_amount, 2), 'transaction_id', v_txn.id, 'description', p_description)
          || jsonb_strip_nulls(jsonb_build_object('payer_name', v_txn.payer_name, 'payer_type', v_txn.payer_type, 'paid_on', v_txn.paid_on)));
  return v_txn;
end;
$$;

revoke execute on function public.admin_deposit(uuid, numeric, text, text, text, date) from public, anon;
grant execute on function public.admin_deposit(uuid, numeric, text, text, text, date) to authenticated, service_role;
