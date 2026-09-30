-- =============================================================================
-- Schedule the automatic jobs.  Run once, after the interest/bills migration.
--
-- Uses pg_cron, Supabase's built-in scheduler. Times are UTC.
-- You can see the jobs and their history under Integrations -> Cron.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Interest for the month just ended, at 00:05 on the 1st of every month.
select cron.schedule('post-monthly-interest', '5 0 1 * *', $$select public.post_monthly_interest()$$);

-- Autopay bills due today, every morning at 09:00.
select cron.schedule('run-autopay', '0 9 * * *', $$select public.run_autopay()$$);

-- Check: two jobs, both active.
select jobname, schedule, command, active from cron.job order by jobname;
