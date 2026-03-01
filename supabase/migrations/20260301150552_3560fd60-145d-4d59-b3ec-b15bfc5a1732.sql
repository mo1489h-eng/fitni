
-- Make both buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('progress-photos', 'post-media');

-- Storage RLS policies for progress-photos bucket
CREATE POLICY "Trainers upload progress photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Trainers read progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Trainers delete progress photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Portal upload progress photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = 'portal');

CREATE POLICY "Portal read progress photos"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = 'portal');

-- Storage RLS policies for post-media bucket
CREATE POLICY "Trainers upload post media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Trainers read post media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read post media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'post-media');

CREATE POLICY "Trainers delete post media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Profile images (avatars/logos stored in progress-photos bucket)
CREATE POLICY "Trainers manage profile images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] IN ('avatars', 'logos') AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Trainers read profile images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] IN ('avatars', 'logos'));

CREATE POLICY "Public read profile images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] IN ('avatars', 'logos'));
