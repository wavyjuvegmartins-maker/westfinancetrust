-- =============================================================================
-- West Finance Trust: monthly interest, autopay bills, customer-managed goals
--
-- Run once, after the initial schema:
--   SQL Editor -> New query -> paste this file -> Run.
-- Then schedule the jobs with supabase/setup/03_schedule_jobs.sql.
-- =============================================================================

-- ------------------------------------------------------- 1. monthly interest

-- One row per account per month, so interest can never be paid twice.
create table public.interest_runs (
  account_id uuid not null references public.accounts (id) on delete cascade,
  period_start date not null,                     -- first day of the month paid for
  amount numeric(14, 2) not null,
  average_balance numeric(14, 2) not null,
  transaction_id uuid references public.transactions (id),
  posted_at timestamptz not null default now(),
  primary key (account_id, period_start)
);

/*
 * Pays last month's interest on every savings account and certificate.
 *
 * Interest is worked out from each day's closing balance (rebuilt from the
 * ledger), compounding daily at the account's APY:
 *   daily rate = (1 + APY)^(1/365) - 1,  interest = sum of (closing balance x daily rate)
 * It's paid into the same account as an "Interest paid" transaction.
 * Safe to run more than once: accounts already paid for that month are skipped.
 */
create or replace function public.post_monthly_interest(p_month date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_start date := date_trunc('month', coalesce(p_month, (now() - interval '1 month')::date))::date;
  v_end date := (date_trunc('month', coalesce(p_month, (now() - interval '1 month')::date)) + interval '1 month')::date;
  v_days int;
  v_account record;
  v_rate numeric;
  v_interest numeric;
  v_average numeric;
  v_txn public.transactions;
  v_paid int := 0;
  v_total numeric := 0;
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can post interest.' using errcode = '42501';
  end if;
  if v_end > current_date then
    raise exception 'That month hasn''t finished yet.' using errcode = '22023';
  end if;
  v_days := v_end - v_start;

  for v_account in
    select a.id, a.apy, a.opened_at
    from public.accounts a
    where a.type in ('savings', 'certificate')
      and a.status = 'active'
      and coalesce(a.apy, 0) > 0
      and a.opened_at < v_end
      and not exists (
        select 1 from public.interest_runs r where r.account_id = a.id and r.period_start = v_start
      )
    for update
  loop
    v_rate := power(1 + v_account.apy / 100, 1.0 / 365) - 1;

    -- Each day's closing balance = today's balance minus everything that happened after that day.
    select coalesce(sum(b.closing), 0) / v_days, coalesce(sum(b.closing * v_rate), 0)
    into v_average, v_interest
    from (
      select greatest(
        case
          when day_end <= v_account.opened_at then 0
          else (select balance from public.accounts where id = v_account.id)
             - coalesce((
                 select sum(t.amount) from public.transactions t
                 where t.account_id = v_account.id and t.created_at >= day_end
               ), 0)
        end, 0) as closing
      from generate_series(v_start, v_end - 1, interval '1 day') as g(day),
           lateral (select (g.day + interval '1 day')::timestamptz as day_end) e
    ) b;

    v_interest := round(v_interest, 2);
    if v_interest >= 0.01 then
      v_txn := public.post_transaction(v_account.id, 'interest', v_interest, 'Interest paid', 'interest');
      insert into public.interest_runs (account_id, period_start, amount, average_balance, transaction_id)
      values (v_account.id, v_start, v_interest, round(v_average, 2), v_txn.id);
      v_paid := v_paid + 1;
      v_total := v_total + v_interest;
    else
      insert into public.interest_runs (account_id, period_start, amount, average_balance)
      values (v_account.id, v_start, 0, round(v_average, 2));
    end if;
  end loop;

  if v_paid > 0 then
    insert into public.audit_log (actor_id, action, target_type, details)
    values (auth.uid(), 'post_interest', 'system',
            jsonb_build_object('month', v_start, 'accounts', v_paid, 'total', v_total));
  end if;

  return jsonb_build_object('month', v_start, 'accounts_paid', v_paid, 'total', v_total);
end;
$$;

-- ------------------------------------------------------------ 2. bills, autopay

-- The account autopay takes the money from (null = the customer's main checking).
alter table public.bills add column pay_from uuid references public.accounts (id) on delete set null;

-- One row per bill per month: paid manually, paid by autopay, or autopay failed.
create table public.bill_payments (
  bill_id uuid not null references public.bills (id) on delete cascade,
  period_start date not null,
  status text not null check (status in ('paid', 'failed')),
  transaction_id uuid references public.transactions (id),
  note text,
  paid_at timestamptz not null default now(),
  primary key (bill_id, period_start)
);

-- The customer's main everyday account.
create or replace function public.default_payment_account(p_profile uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select h.account_id
  from public.account_holders h
  join public.accounts a on a.id = h.account_id
  where h.profile_id = p_profile and h.can_transact and a.status = 'active' and a.type = 'checking'
  order by a.account_number
  limit 1;
$$;

-- Manual payment: now also records the month, so autopay won't pay it again.
create or replace function public.pay_bill(p_from uuid, p_bill uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_bill public.bills;
  v_txn public.transactions;
  v_period date := date_trunc('month', now())::date;
begin
  select * into v_bill from public.bills where id = p_bill and owner_id = auth.uid();
  if not found then
    raise exception 'That bill isn''t on your list.' using errcode = '42501';
  end if;
  if not public.can_transact(p_from) then
    raise exception 'You can''t pay bills from that account.' using errcode = '42501';
  end if;
  if exists (select 1 from public.bill_payments where bill_id = p_bill and period_start = v_period and status = 'paid') then
    raise exception 'You''ve already paid this bill this month.' using errcode = 'P0001';
  end if;

  v_txn := public.post_transaction(p_from, 'bill', -v_bill.amount, v_bill.name, v_bill.category);
  insert into public.bill_payments (bill_id, period_start, status, transaction_id)
  values (p_bill, v_period, 'paid', v_txn.id)
  on conflict (bill_id, period_start) do update
    set status = 'paid', transaction_id = excluded.transaction_id, note = null, paid_at = now();
  return v_txn.id;
end;
$$;

/*
 * Pays every autopay bill due on p_day that hasn't been paid this month.
 * A payment that can't be made (not enough money, no account) is recorded as
 * failed and the customer is told, and it isn't retried automatically.
 */
create or replace function public.run_autopay(p_day date default current_date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_bill record;
  v_from uuid;
  v_txn public.transactions;
  v_period date := date_trunc('month', p_day)::date;
  v_paid int := 0;
  v_failed int := 0;
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can run autopay.' using errcode = '42501';
  end if;

  for v_bill in
    select b.* from public.bills b
    where b.autopay
      and b.due_day = extract(day from p_day)::int
      and not exists (select 1 from public.bill_payments p where p.bill_id = b.id and p.period_start = v_period)
  loop
    v_from := coalesce(v_bill.pay_from, public.default_payment_account(v_bill.owner_id));
    begin
      if v_from is null then
        raise exception 'No account to pay from.';
      end if;
      v_txn := public.post_transaction(v_from, 'bill', -v_bill.amount, v_bill.name, v_bill.category);
      insert into public.bill_payments (bill_id, period_start, status, transaction_id)
      values (v_bill.id, v_period, 'paid', v_txn.id);
      v_paid := v_paid + 1;
    exception when others then
      insert into public.bill_payments (bill_id, period_start, status, note)
      values (v_bill.id, v_period, 'failed', sqlerrm)
      on conflict (bill_id, period_start) do nothing;
      insert into public.notifications (profile_id, kind, title, body)
      values (v_bill.owner_id, 'blocked', 'Autopay didn''t go through',
              format('We couldn''t pay %s (%s): %s Pay it from Move money when you''re ready.',
                     v_bill.name, to_char(v_bill.amount, 'FM$999,999,990.00'), sqlerrm));
      v_failed := v_failed + 1;
    end;
  end loop;

  return jsonb_build_object('day', p_day, 'paid', v_paid, 'failed', v_failed);
end;
$$;

-- Bills: the pay-from account must be one the customer can use.
drop policy "bills: own" on public.bills;
create policy "bills: read own" on public.bills
  for select to authenticated using (owner_id = auth.uid());
create policy "bills: add own" on public.bills
  for insert to authenticated
  with check (owner_id = auth.uid() and (pay_from is null or public.can_transact(pay_from)));
create policy "bills: edit own" on public.bills
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (pay_from is null or public.can_transact(pay_from)));
create policy "bills: delete own" on public.bills
  for delete to authenticated using (owner_id = auth.uid());

-- ------------------------------------------------------ 3. security for the new tables

alter table public.interest_runs enable row level security;
alter table public.bill_payments enable row level security;

create policy "interest runs: holders and staff" on public.interest_runs
  for select to authenticated using (public.can_view_account(account_id));
create policy "bill payments: own" on public.bill_payments
  for select to authenticated
  using (exists (select 1 from public.bills b where b.id = bill_id and b.owner_id = auth.uid()) or public.is_staff());

revoke all on public.interest_runs, public.bill_payments from anon;
revoke insert, update, delete on public.interest_runs, public.bill_payments from authenticated;

revoke execute on function public.post_monthly_interest(date), public.run_autopay(date), public.default_payment_account(uuid)
  from public, anon;
grant execute on function public.post_monthly_interest(date), public.run_autopay(date) to authenticated, service_role;

-- Customers' bill changes and payments show up live.
alter publication supabase_realtime add table public.bill_payments;
