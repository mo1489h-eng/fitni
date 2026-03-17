
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS page_config jsonb DEFAULT '{}'::jsonb;
