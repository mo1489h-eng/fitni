
-- Add subscription fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscribed_at timestamptz DEFAULT NULL;
