
-- 1. Allow clients to read their own nutrition logs
CREATE POLICY "Clients can read own nutrition logs"
ON public.nutrition_logs
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
  )
);

-- 2. Fix storage policy: drop unsafe name-matching policy and replace with proper check
DROP POLICY IF EXISTS "Clients read own progress photos" ON storage.objects;

CREATE POLICY "Clients read own progress photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND EXISTS (
    SELECT 1
    FROM progress_photos pp
    JOIN clients c ON c.id = pp.client_id
    WHERE c.auth_user_id = auth.uid()
      AND name = regexp_replace(pp.photo_url, '^.*/storage/v1/object/public/progress-photos/', '')
  )
);
