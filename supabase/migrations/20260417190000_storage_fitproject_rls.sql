-- RLS for private bucket `fitproject` (Marketplace.tsx: marketplace/{trainer_id}/..., Vault.tsx: vault-covers/{trainer_id}/...)
-- Path layout: (storage.foldername(name))[1] = top folder, [2] = owner user id (uuid).

CREATE POLICY "fitproject_authenticated_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fitproject'
  AND (
    (
      (storage.foldername(name))[1] = 'marketplace'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'vault-covers'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);

CREATE POLICY "fitproject_authenticated_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fitproject'
  AND (
    (
      (storage.foldername(name))[1] = 'marketplace'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'vault-covers'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);

-- Published listing cover images must load for buyers (Store / signed URLs); mirrors gallery public-read pattern.
CREATE POLICY "fitproject_public_select_marketplace"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'fitproject'
  AND (storage.foldername(name))[1] = 'marketplace'
);

CREATE POLICY "fitproject_authenticated_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fitproject'
  AND (
    (
      (storage.foldername(name))[1] = 'marketplace'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'vault-covers'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'fitproject'
  AND (
    (
      (storage.foldername(name))[1] = 'marketplace'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'vault-covers'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);

CREATE POLICY "fitproject_authenticated_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'fitproject'
  AND (
    (
      (storage.foldername(name))[1] = 'marketplace'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'vault-covers'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);
