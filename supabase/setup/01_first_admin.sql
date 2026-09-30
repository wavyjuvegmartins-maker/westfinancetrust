-- =============================================================================
-- Make your first admin.  Run once, after the initial schema.
--
-- 1. Supabase dashboard -> Authentication -> Users -> Add user -> Create new user.
--    Enter the admin's email and a strong password, and tick "Auto Confirm User".
-- 2. Change the values marked CHANGE below, then run this in the SQL Editor.
--
-- Every other user (customers, account openers) will be created from the
-- admin area of the app, never by hand.
-- =============================================================================

insert into public.profiles (id, user_id, first_name, last_name, email, role, must_change_password)
select
  u.id,
  'admin',                          -- CHANGE: the admin's login ID (lowercase, 4+ characters)
  'Site',                           -- CHANGE: first name
  'Admin',                          -- CHANGE: last name
  u.email,
  'admin',
  false
from auth.users u
where u.email = 'admin@westfinancetrust.com';  -- CHANGE: the email you used in step 1

-- Check it worked: you should see one row with role = admin.
select user_id, first_name, last_name, email, role from public.profiles where role = 'admin';
