-- Upload audit: ensure buckets exist, align limits/mime types with app, portal progress photos for anon sessions.

-- fitproject: referenced by Marketplace + Vault covers; migrations only UPDATED this bucket before
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fitproject',
  'fitproject',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- post-media: TrainerContent uploads images + videos (UI allows up to 20MB video)
UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]::text[]
WHERE id = 'post-media';

-- vault-content: PDF / large video / images (app validates; bucket must allow)
UPDATE storage.buckets
SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]::text[]
WHERE id = 'vault-content';

-- Portal link-only clients (anon) upload progress photos under portal/{client_id}/...
DROP POLICY IF EXISTS "Portal anon upload progress photos" ON storage.objects;
CREATE POLICY "Portal anon upload progress photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'portal'
);

DROP POLICY IF EXISTS "Portal anon read progress photos" ON storage.objects;
CREATE POLICY "Portal anon read progress photos"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'portal'
);

DROP POLICY IF EXISTS "Portal anon update progress photos" ON storage.objects;
CREATE POLICY "Portal anon update progress photos"
ON storage.objects FOR UPDATE TO anon
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'portal'
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'portal'
);

-- Landing page covers: explicit policies (path covers/{uid}/...)
DROP POLICY IF EXISTS "Trainers upload landing covers" ON storage.objects;
CREATE POLICY "Trainers upload landing covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Trainers read landing covers" ON storage.objects;
CREATE POLICY "Trainers read landing covers"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Trainers update landing covers" ON storage.objects;
CREATE POLICY "Trainers update landing covers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Trainers delete landing covers" ON storage.objects;
CREATE POLICY "Trainers delete landing covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
