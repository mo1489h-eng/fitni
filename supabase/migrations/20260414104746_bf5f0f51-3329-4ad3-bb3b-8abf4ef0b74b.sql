-- Fix flawed storage policy for client progress photo access
DROP POLICY IF EXISTS "Clients read own progress photos" ON storage.objects;

CREATE POLICY "Clients read own progress photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND EXISTS (
    SELECT 1
    FROM public.progress_photos pp
    JOIN public.clients c ON c.id = pp.client_id
    WHERE c.auth_user_id = auth.uid()
      AND name = pp.photo_url
  )
);