-- Add storage policy for clients to read their own progress photos
-- Clients authenticate via auth_user_id linked to their client record
CREATE POLICY "Clients read own progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND EXISTS (
    SELECT 1 FROM public.progress_photos pp
    JOIN public.clients c ON c.id = pp.client_id
    WHERE c.auth_user_id = auth.uid()
      AND pp.photo_url LIKE '%' || name || '%'
  )
);

-- Tighten trainer read policy: ensure the trainer folder matches their uid
-- Drop the old broad policy first if it exists
DROP POLICY IF EXISTS "Trainers read progress photos" ON storage.objects;

CREATE POLICY "Trainers read progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);