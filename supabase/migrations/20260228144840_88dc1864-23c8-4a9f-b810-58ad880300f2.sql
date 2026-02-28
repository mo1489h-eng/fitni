
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialization text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notify_inactive boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payments boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_report boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#16a34a',
  ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT '';
