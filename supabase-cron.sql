-- FinOps Academy — Weekly Slack Reminder Cron Job
-- Run this in Supabase SQL Editor after deploying the Edge Function.
-- Requires pg_net extension (enabled by default on Supabase).

-- Enable pg_net if not already enabled
create extension if not exists pg_net;

-- Schedule the weekly reminder every Monday at 9am UTC
-- Replace YOUR_CRON_SECRET with the value you set in Supabase secrets
select cron.schedule(
  'finops-weekly-reminder',
  '0 9 * * 1',
  $$
  select net.http_post(
    url     := 'https://kaamlklcaxeabtetsxus.supabase.co/functions/v1/weekly-reminder',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);

-- To verify it's scheduled:
-- select * from cron.job;

-- To unschedule:
-- select cron.unschedule('finops-weekly-reminder');

-- To trigger manually for testing (run in SQL editor):
-- select net.http_post(
--   url     := 'https://kaamlklcaxeabtetsxus.supabase.co/functions/v1/weekly-reminder',
--   headers := '{"Authorization": "Bearer YOUR_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
--   body    := '{}'::jsonb
-- );
