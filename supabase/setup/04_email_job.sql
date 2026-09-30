-- =============================================================================
-- Send notification emails every 5 minutes.  Run once, AFTER the site is live
-- on its real domain and after the email outbox migration.
--
-- Most emails go out straight away from the app. This job picks up the ones
-- made by the scheduled jobs (interest on the 1st, autopay at 09:00), which
-- happen inside the database with nobody on the site to send them.
--
-- Before running, replace the two placeholders:
--   https://YOUR-DOMAIN      -> the site's address, same as NEXT_PUBLIC_SITE_URL
--   YOUR-CRON-SECRET         -> the CRON_SECRET value from the site's environment
-- The secret is kept in Supabase Vault, not in the job's text.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

select vault.create_secret('YOUR-CRON-SECRET', 'email_cron_secret');

select cron.schedule(
  'send-notification-emails',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-DOMAIN/api/cron/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Check: the job is listed and active. Responses show up in net._http_response.
select jobname, schedule, active from cron.job where jobname = 'send-notification-emails';
