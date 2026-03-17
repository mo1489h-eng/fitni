
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';
