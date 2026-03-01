
-- Fix: Replace overly permissive INSERT policy with one restricted to trigger-inserted rows
DROP POLICY "System can insert notifications" ON public.trainer_notifications;

-- Notifications are only inserted by SECURITY DEFINER trigger functions,
-- which bypass RLS. No direct INSERT policy needed for users.
