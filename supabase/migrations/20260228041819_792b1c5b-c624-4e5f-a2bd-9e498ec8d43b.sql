
-- Add single-use columns to promo_codes
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS used_by_trainer_id uuid,
  ADD COLUMN IF NOT EXISTS used_at timestamp with time zone;

-- Update existing sample codes to be single-use (reset them)
UPDATE public.promo_codes SET max_uses = 1, used_count = 0;
