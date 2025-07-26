-- Setup cron job for weekly price calculation
-- This will run every Monday at 09:15

-- First, ensure pg_cron extension is enabled (run as superuser if needed)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the weekly price calculation cron job
-- This runs every Monday at 09:15 (15 9 * * 1 in cron format)
SELECT cron.schedule(
  'weekly-share-price-calculation',
  '15 9 * * 1',
  'SELECT calculate_weekly_share_price_from_jse200();'
);

-- Check if the cron job was created successfully
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'weekly-share-price-calculation';

-- Function to manually check cron job status
CREATE OR REPLACE FUNCTION check_cron_job_status()
RETURNS TABLE(
  jobid bigint,
  schedule text,
  command text,
  active boolean,
  last_run_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.active,
    COALESCE(jr.status, 'Never run') as last_run_status
  FROM cron.job j
  LEFT JOIN (
    SELECT DISTINCT ON (jobid) jobid, status
    FROM cron.job_run_details
    ORDER BY jobid, start_time DESC
  ) jr ON j.jobid = jr.jobid
  WHERE j.jobname = 'weekly-share-price-calculation';
END;
$$;

-- Function to manually unschedule the cron job (if needed)
CREATE OR REPLACE FUNCTION unschedule_weekly_price_cron()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id bigint;
BEGIN
  -- Get the job ID
  SELECT jobid INTO job_id
  FROM cron.job
  WHERE jobname = 'weekly-share-price-calculation';
  
  -- Unschedule if exists
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Add some helpful comments
COMMENT ON FUNCTION calculate_weekly_share_price_from_jse200() IS 'Calculates weekly share price based on JSE200 percentage change - runs every Monday at 09:15';
COMMENT ON FUNCTION check_cron_job_status() IS 'Check the status of the weekly price calculation cron job';
COMMENT ON FUNCTION unschedule_weekly_price_cron() IS 'Remove the weekly price calculation cron job';
