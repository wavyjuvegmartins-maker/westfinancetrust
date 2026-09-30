-- =============================================================================
-- Optional: a test customer (Aloy Tony) with the same accounts the dashboard
-- demo shows, so you can try the app against real data before the admin area
-- is built.  Skip this in production.
--
-- 1. Authentication -> Users -> Add user -> Create new user:
--      email aloy.tony@example.com, any strong password, tick "Auto Confirm User".
-- 2. Run this whole file in the SQL Editor.
-- =============================================================================

do $$
declare
  v_user uuid;
  v_admin uuid;
  v_checking uuid;
  v_savings uuid;
begin
  select id into v_user from auth.users where email = 'aloy.tony@example.com';
  if v_user is null then
    raise exception 'Create the auth user aloy.tony@example.com first (step 1).';
  end if;
  select id into v_admin from public.profiles where role = 'admin' limit 1;

  insert into public.profiles (id, user_id, first_name, last_name, email, phone, branch, role, must_change_password, created_by)
  values (v_user, 'aloy.tony', 'Aloy', 'Tony', 'aloy.tony@example.com', '+1 (555) 014-2290', 'Main branch', 'customer', false, v_admin);

  -- Accounts, opened with their starting balances (each opening deposit is logged).
  v_checking := (public.admin_open_account(v_user, 'checking', 'Everyday Checking', null, null, 8420.37)).id;
  v_savings  := (public.admin_open_account(v_user, 'savings', 'High-Yield Savings', 4.10, null, 24380.52)).id;
  perform public.admin_open_account(v_user, 'certificate', '12-month Certificate', 4.50,
                                    (current_date + interval '1 year')::date, 10000);

  insert into public.cards (account_id, holder_id, last4, expiry_month, expiry_year)
  values (v_checking, v_user, '4821', 8, 2029);

  insert into public.payees (owner_id, name, bank_name, account_mask, added_by) values
    (v_user, 'Jordan Lee', 'Harbor Bank', '2210', v_admin),
    (v_user, 'Priya Shah', 'First Coast Credit Union', '8841', v_admin),
    (v_user, 'Marcus Chen', 'West Finance Trust', '1057', v_admin),
    (v_user, 'Linda Hayes', 'Summit Savings', '4476', v_admin);

  insert into public.bills (owner_id, name, amount, due_day, autopay, category) values
    (v_user, 'Maple Court Apartments', 1850.00, 1, true, 'bills'),
    (v_user, 'Harbor Fitness', 49.00, 3, true, 'other'),
    (v_user, 'Netflix', 15.49, 7, true, 'entertainment'),
    (v_user, 'Con Edison', 104.32, 12, false, 'bills'),
    (v_user, 'Verizon', 85.00, 18, false, 'bills'),
    (v_user, 'Spotify', 11.99, 21, true, 'entertainment');

  insert into public.savings_goals (owner_id, account_id, name, target, saved) values
    (v_user, v_savings, 'Emergency fund', 15000, 9800),
    (v_user, v_savings, 'Japan in spring', 6000, 2350),
    (v_user, v_savings, 'New laptop', 2400, 1890);
end $$;

-- Check it worked: three accounts with balances.
select a.account_number, a.name, a.balance
from public.accounts a
join public.account_holders h on h.account_id = a.id
join public.profiles p on p.id = h.profile_id
where p.user_id = 'aloy.tony'
order by a.account_number;
