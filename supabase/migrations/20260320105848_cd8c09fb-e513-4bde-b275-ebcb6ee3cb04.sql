-- Drop overly broad storage policies that allow cross-trainer photo access
DROP POLICY IF EXISTS "Authenticated upload progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete progress photos" ON storage.objects;

-- The folder-scoped trainer policies remain:
-- "Trainers read progress photos" (folder-scoped)
-- "Trainers upload progress photos" (folder-scoped)
-- "Trainers delete progress photos" (folder-scoped)

-- Add client upload policy scoped to their trainer's folder
-- Clients upload via SECURITY DEFINER RPCs, so no additional storage policy needed