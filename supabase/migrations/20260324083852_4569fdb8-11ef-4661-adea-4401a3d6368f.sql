-- Fix storage bucket settings: add file size limits and mime type restrictions
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'progress-photos';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'post-media';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'fitproject';

-- Add storage policy for gallery uploads (path: gallery/{user_id}/...)
CREATE POLICY "Trainers upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'gallery'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Add storage policy for reading gallery images (for signed URLs)
CREATE POLICY "Trainers read gallery images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'gallery'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Add public read for gallery images (needed for signed URLs to work)
CREATE POLICY "Public read gallery images"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'gallery'
);

-- Add delete policy for gallery images
CREATE POLICY "Trainers delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'gallery'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Update existing profile images upload policy to also allow 'gallery' folder
-- (Keep existing policy, already covered by new gallery-specific policies above)

-- Add update/upsert policy for profile images (avatars, logos)
CREATE POLICY "Trainers update profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = ANY (ARRAY['avatars', 'logos'])
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Add update policy for gallery images
CREATE POLICY "Trainers update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = 'gallery'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Add delete policy for profile images (avatars, logos)
CREATE POLICY "Trainers delete profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = ANY (ARRAY['avatars', 'logos'])
  AND (storage.foldername(name))[2] = (auth.uid())::text
);