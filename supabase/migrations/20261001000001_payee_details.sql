-- =============================================================================
-- West Finance Trust: full payee details, added by staff on the customer's request
--
-- Run once, after the earlier migrations: SQL Editor -> New query -> paste -> Run.
-- =============================================================================

-- The details needed to actually send money, and how the request came in.
-- Customers only ever see the last four digits (account_mask).
alter table public.payees
  add column routing_number text check (routing_number ~ '^[0-9]{9}$'),
  add column account_number text check (account_number ~ '^[0-9]{4,17}$'),
  add column added_via text check (added_via in ('phone', 'branch'));

-- The last four digits always match the full account number when there is one.
alter table public.payees
  add constraint payees_mask_matches check (account_number is null or right(account_number, 4) = account_mask);

-- Customers can remove a payee themselves (adding one still goes through staff).
grant delete on public.payees to authenticated;
create policy "payees: owner removes" on public.payees
  for delete to authenticated using (owner_id = auth.uid());

-- Anyone paying a payee sees changes to their list straight away.
alter publication supabase_realtime add table public.payees;
