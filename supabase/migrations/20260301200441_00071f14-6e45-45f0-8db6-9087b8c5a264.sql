
-- Add subscription tracking columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'free';

-- Add Moyasar payment ID tracking  
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_payment_id text;
