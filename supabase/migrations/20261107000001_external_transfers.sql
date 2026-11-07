-- =============================================================================
-- West Finance Trust: transfers to other banks, at home and abroad.
--
-- How it works (and what this enforces):
--   * A customer enters the recipient's bank details themselves and asks for a
--     transfer. The money is held from their account straight away (a pending
--     "transfer out"), so it can't be spent twice.
--   * Each transfer waits for an admin. Approving it means the bank has sent it:
--     the held transaction posts. Rejecting it needs a reason, which the
--     customer sees, and the held money goes back to the account.
--   * Domestic transfers need a US routing number. International ones need a
--     SWIFT/BIC code, the bank's country and the recipient's address, and take
--     7 days to process.
--   * Nothing here sends money anywhere: staff send it by hand, then approve.
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- ------------------------------------------------------------- 1. the table

create table public.external_transfers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id),                 -- paid from
  transaction_id uuid not null unique references public.transactions (id),  -- the hold
  refund_transaction_id uuid references public.transactions (id),          -- set when rejected
  scope text not null check (scope in ('domestic', 'international')),
  amount numeric(14, 2) not null check (amount > 0),
  recipient_name text not null check (char_length(recipient_name) between 2 and 80),
  recipient_address text check (char_length(recipient_address) <= 160),
  bank_name text not null check (char_length(bank_name) between 2 and 80),
  bank_country text check (char_length(bank_country) <= 60),
  routing_number text check (routing_number ~ '^[0-9]{9}$'),
  swift_code text check (swift_code ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  account_number text not null check (account_number ~ '^[A-Z0-9]{4,34}$'),
  note text check (char_length(note) <= 60),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 200),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (scope <> 'domestic' or routing_number is not null),
  check (scope <> 'international' or (swift_code is not null and bank_country is not null and recipient_address is not null)),
  check ((status = 'rejected') = (reject_reason is not null))
);
create index external_transfers_profile_idx on public.external_transfers (profile_id, created_at desc);
create index external_transfers_pending_idx on public.external_transfers (created_at) where status = 'pending';

-- ------------------------------------------------------------ 2. helpers

-- US routing numbers carry a 3-7-1 weighted checksum. Mirrors isValidRoutingNumber in src/lib/schemas.ts.
create or replace function public.routing_number_ok(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p ~ '^[0-9]{9}$' and (
    3 * (substr(p, 1, 1)::int + substr(p, 4, 1)::int + substr(p, 7, 1)::int)
    + 7 * (substr(p, 2, 1)::int + substr(p, 5, 1)::int + substr(p, 8, 1)::int)
    + (substr(p, 3, 1)::int + substr(p, 6, 1)::int + substr(p, 9, 1)::int)
  ) % 10 = 0;
$$;

-- "$1,250.00", for notifications.
create or replace function public.money_text(p numeric)
returns text language sql immutable set search_path = '' as $$
  select to_char(p, 'FM$999,999,990.00');
$$;

-- --------------------------------------------- 3. customer: ask to transfer

create or replace function public.request_external_transfer(
  p_from uuid,
  p_scope text,
  p_amount numeric,
  p_recipient_name text,
  p_bank_name text,
  p_account_number text,
  p_routing_number text default null,
  p_swift_code text default null,
  p_bank_country text default null,
  p_recipient_address text default null,
  p_note text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_txn public.transactions;
  v_id uuid;
  v_intl boolean := p_scope = 'international';
begin
  if not public.is_active_customer() then
    raise exception 'Only customers can do that.' using errcode = '42501';
  end if;
  if not public.can_transact(p_from) then
    raise exception 'You can''t send money from that account.' using errcode = '42501';
  end if;
  if exists (select 1 from public.accounts where id = p_from and type = 'certificate') then
    raise exception 'Money can''t be sent straight from a certificate.' using errcode = '22023';
  end if;
  if p_scope is null or p_scope not in ('domestic', 'international') then
    raise exception 'Choose a domestic or international transfer.' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 25000 then
    raise exception 'Enter an amount between $0.01 and $25,000.' using errcode = '22023';
  end if;
  if p_amount <> round(p_amount, 2) then
    raise exception 'Amounts can''t have more than two decimal places.' using errcode = '22023';
  end if;

  p_recipient_name := nullif(btrim(p_recipient_name), '');
  p_bank_name := nullif(btrim(p_bank_name), '');
  p_account_number := upper(regexp_replace(coalesce(p_account_number, ''), '[\s-]', '', 'g'));
  p_routing_number := nullif(regexp_replace(coalesce(p_routing_number, ''), '[\s-]', '', 'g'), '');
  p_swift_code := nullif(upper(regexp_replace(coalesce(p_swift_code, ''), '\s', '', 'g')), '');
  p_bank_country := nullif(btrim(p_bank_country), '');
  p_recipient_address := nullif(btrim(p_recipient_address), '');
  p_note := nullif(btrim(p_note), '');

  if p_recipient_name is null or char_length(p_recipient_name) not between 2 and 80 then
    raise exception 'Enter the name on the recipient''s account.' using errcode = '22023';
  end if;
  if p_bank_name is null or char_length(p_bank_name) not between 2 and 80 then
    raise exception 'Enter the recipient''s bank.' using errcode = '22023';
  end if;
  if char_length(p_note) > 60 then
    raise exception 'Keep the note under 60 characters.' using errcode = '22023';
  end if;

  if v_intl then
    if p_swift_code is null or p_swift_code !~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$' then
      raise exception 'SWIFT/BIC codes are 8 or 11 letters and numbers.' using errcode = '22023';
    end if;
    if p_account_number !~ '^[A-Z0-9]{4,34}$' then
      raise exception 'Enter the IBAN or account number, 4 to 34 letters and numbers.' using errcode = '22023';
    end if;
    if p_bank_country is null or char_length(p_bank_country) > 60 then
      raise exception 'Enter the country the bank is in.' using errcode = '22023';
    end if;
    if p_recipient_address is null or char_length(p_recipient_address) > 160 then
      raise exception 'Enter the recipient''s address.' using errcode = '22023';
    end if;
    p_routing_number := null;
  else
    if p_routing_number is null or not public.routing_number_ok(p_routing_number) then
      raise exception 'That routing number isn''t valid. Check it with the recipient.' using errcode = '22023';
    end if;
    if p_account_number !~ '^[0-9]{4,17}$' then
      raise exception 'Account numbers are 4 to 17 digits.' using errcode = '22023';
    end if;
    p_swift_code := null;
    p_bank_country := null;
    p_recipient_address := null;
  end if;

  if (select count(*) from public.external_transfers
      where profile_id = auth.uid() and status = 'pending') >= 10 then
    raise exception 'You have 10 transfers waiting for approval. We''ll get to them soon.' using errcode = 'P0001';
  end if;

  -- Hold the money now. Customer-made transfers don't trigger the automatic alert;
  -- the security alert below is sent instead.
  v_txn := public.post_transaction(
    p_from, 'transfer_out', -p_amount,
    left(format('To %s, %s', p_recipient_name, p_bank_name), 120),
    'transfer', p_note, null, 'pending'
  );

  insert into public.external_transfers
    (profile_id, account_id, transaction_id, scope, amount, recipient_name, recipient_address,
     bank_name, bank_country, routing_number, swift_code, account_number, note)
  values
    (auth.uid(), p_from, v_txn.id, p_scope, p_amount, p_recipient_name, p_recipient_address,
     p_bank_name, p_bank_country, p_routing_number, p_swift_code, p_account_number, p_note)
  returning id into v_id;

  -- Emailed as a security alert, so a transfer someone else started gets noticed.
  insert into public.notifications (profile_id, kind, title, body)
  values (auth.uid(), 'security',
          case when v_intl then 'International transfer requested' else 'Transfer requested' end,
          format('%s to %s at %s, account ending %s. It''s pending until our team approves it.%s If this wasn''t you, call us straight away.',
                 public.money_text(p_amount), p_recipient_name, p_bank_name, right(p_account_number, 4),
                 case when v_intl then ' International transfers take 7 days to process.' else '' end));

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'request_external_transfer', 'account', p_from,
          jsonb_build_object('transfer_id', v_id, 'scope', p_scope, 'amount', p_amount,
                             'recipient', p_recipient_name, 'bank', p_bank_name, 'account_mask', right(p_account_number, 4)));
  return v_id;
end;
$$;

-- ---------------------------------------------- 4. admin: approve or reject

create or replace function public.admin_review_external_transfer(p_id uuid, p_approve boolean, p_reason text default null)
returns public.external_transfers language plpgsql security definer set search_path = '' as $$
declare
  v_t public.external_transfers;
  v_balance numeric(14, 2);
  v_refund uuid;
  v_account_name text;
  v_amount text;
begin
  if not public.is_privileged() then
    raise exception 'Only an admin can approve transfers.' using errcode = '42501';
  end if;
  p_reason := nullif(btrim(p_reason), '');
  if not p_approve and p_reason is null then
    raise exception 'Give the customer a reason for rejecting it.' using errcode = '22023';
  end if;
  if char_length(p_reason) > 200 then
    raise exception 'Keep the reason under 200 characters.' using errcode = '22023';
  end if;

  select * into v_t from public.external_transfers where id = p_id for update;
  if not found then
    raise exception 'That transfer doesn''t exist.' using errcode = 'P0002';
  end if;
  if v_t.status <> 'pending' then
    raise exception 'That transfer has already been %.', case v_t.status when 'completed' then 'approved' else 'rejected' end
      using errcode = 'P0001';
  end if;

  v_amount := public.money_text(v_t.amount);
  select name into v_account_name from public.accounts where id = v_t.account_id;

  if p_approve then
    update public.transactions set status = 'posted', posted_at = now() where id = v_t.transaction_id;
  else
    -- Give the held money back. Done directly rather than through post_transaction,
    -- so it still works if the account has been frozen since.
    update public.accounts set balance = balance + v_t.amount
    where id = v_t.account_id
    returning balance into v_balance;

    insert into public.transactions
      (account_id, type, status, amount, balance_after, description, category, created_by, posted_at)
    values
      (v_t.account_id, 'transfer_in', 'posted', v_t.amount, v_balance,
       left(format('Returned: transfer to %s', v_t.recipient_name), 120), 'transfer', auth.uid(), now())
    returning id into v_refund;

    update public.transactions set status = 'reversed' where id = v_t.transaction_id;
  end if;

  update public.external_transfers set
    status = case when p_approve then 'completed' else 'rejected' end,
    reject_reason = case when p_approve then null else p_reason end,
    refund_transaction_id = v_refund,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id
  returning * into v_t;

  insert into public.notifications (profile_id, kind, title, body)
  values (v_t.profile_id,
          case when p_approve then 'payment'::public.notice_kind else 'info'::public.notice_kind end,
          case when p_approve then 'Transfer approved' else 'Transfer rejected' end,
          case when p_approve
            then format('%s to %s at %s has been approved and sent.%s', v_amount, v_t.recipient_name, v_t.bank_name,
                        case when v_t.scope = 'international' then ' International transfers take 7 days to process.' else '' end)
            else format('Your %s transfer to %s wasn''t sent and the money is back in %s. Reason: %s',
                        v_amount, v_t.recipient_name, coalesce(v_account_name, 'your account'), p_reason)
          end);

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_approve then 'approve_external_transfer' else 'reject_external_transfer' end,
          'profile', v_t.profile_id,
          jsonb_build_object('transfer_id', v_t.id, 'scope', v_t.scope, 'amount', v_t.amount,
                             'recipient', v_t.recipient_name, 'bank', v_t.bank_name)
          || jsonb_strip_nulls(jsonb_build_object('reason', p_reason)));
  return v_t;
end;
$$;

-- ------------------------------------------------ 5. row level security

alter table public.external_transfers enable row level security;

create policy "external transfers: own, staff all" on public.external_transfers
  for select to authenticated using (profile_id = (select auth.uid()) or (select public.is_staff()));

-- Nobody writes this from the browser: only the functions above.
revoke all on public.external_transfers from anon;
revoke insert, update, delete on public.external_transfers from authenticated;
grant select on public.external_transfers to authenticated;

-- ------------------------------------------------------- 6. privileges

revoke execute on function
  public.routing_number_ok(text),
  public.money_text(numeric),
  public.request_external_transfer(uuid, text, numeric, text, text, text, text, text, text, text, text),
  public.admin_review_external_transfer(uuid, boolean, text)
from public, anon;

grant execute on function
  public.request_external_transfer(uuid, text, numeric, text, text, text, text, text, text, text, text),
  public.admin_review_external_transfer(uuid, boolean, text)
to authenticated, service_role;

-- ------------------------------------------------------ 7. live updates

-- The staff approval queue updates as transfers come in.
alter publication supabase_realtime add table public.external_transfers;

-- Check: the table exists and is empty.
select count(*) as external_transfers from public.external_transfers;
