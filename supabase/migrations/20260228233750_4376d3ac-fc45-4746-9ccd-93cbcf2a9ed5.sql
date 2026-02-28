
ALTER TABLE public.trainer_posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS audience_client_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload post media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-media');
CREATE POLICY "Anyone can view post media" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Users can delete own post media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-media');
