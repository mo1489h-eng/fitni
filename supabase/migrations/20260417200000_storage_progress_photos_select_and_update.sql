-- Fix "Clients read own progress photos": inside EXISTS, unqualified `name` resolved to
-- clients.name (display name), not storage.objects.name — so the join never matched.
-- Normalize photo_url when stored as a full Supabase URL (legacy rows).
--
-- Add UPDATE for trainer-owned paths so storage uploads with upsert=true can replace objects.

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
      AND storage.objects.name = (
        CASE
          WHEN pp.photo_url IS NULL OR btrim(pp.photo_url) = '' THEN NULL
          WHEN pp.photo_url LIKE 'http%' THEN
            substring(pp.photo_url from 'progress-photos/([^?]+)')
          ELSE pp.photo_url
        END
      )
  )
);

-- Same path check for replace/upsert when the client overwrites an existing object path.
CREATE POLICY "Clients update own progress photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND EXISTS (
    SELECT 1
    FROM public.progress_photos pp
    JOIN public.clients c ON c.id = pp.client_id
    WHERE c.auth_user_id = auth.uid()
      AND storage.objects.name = (
        CASE
          WHEN pp.photo_url IS NULL OR btrim(pp.photo_url) = '' THEN NULL
          WHEN pp.photo_url LIKE 'http%' THEN
            substring(pp.photo_url from 'progress-photos/([^?]+)')
          ELSE pp.photo_url
        END
      )
  )
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND EXISTS (
    SELECT 1
    FROM public.progress_photos pp
    JOIN public.clients c ON c.id = pp.client_id
    WHERE c.auth_user_id = auth.uid()
      AND storage.objects.name = (
        CASE
          WHEN pp.photo_url IS NULL OR btrim(pp.photo_url) = '' THEN NULL
          WHEN pp.photo_url LIKE 'http%' THEN
            substring(pp.photo_url from 'progress-photos/([^?]+)')
          ELSE pp.photo_url
        END
      )
  )
);

-- Trainer uploads live under {auth.uid()}/… (see "Trainers upload progress photos").
CREATE POLICY "Trainers update progress photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
