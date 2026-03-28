
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to clean old copilot messages and keep only last 50 per trainer
CREATE OR REPLACE FUNCTION public.cleanup_copilot_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete messages older than 30 days
  DELETE FROM public.copilot_messages
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Keep only last 50 messages per trainer
  DELETE FROM public.copilot_messages
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY trainer_id ORDER BY created_at DESC) as rn
      FROM public.copilot_messages
    ) ranked
    WHERE rn > 50
  );
END;
$$;
