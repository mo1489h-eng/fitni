
-- Add video_url to program_exercises
ALTER TABLE public.program_exercises ADD COLUMN video_url text DEFAULT null;

-- Create progress_photos table
CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id uuid,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  photo_url text NOT NULL,
  uploaded_by text NOT NULL CHECK (uploaded_by IN ('trainer', 'client')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Trainer can read photos of their clients
CREATE POLICY "Trainers can read client photos"
ON public.progress_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = progress_photos.client_id AND c.trainer_id = auth.uid()
  )
);

-- Trainer can insert photos for their clients
CREATE POLICY "Trainers can insert client photos"
ON public.progress_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = progress_photos.client_id AND c.trainer_id = auth.uid()
  )
);

-- Trainer can delete photos of their clients
CREATE POLICY "Trainers can delete client photos"
ON public.progress_photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = progress_photos.client_id AND c.trainer_id = auth.uid()
  )
);

-- Anonymous/portal read access for client photos
CREATE POLICY "Portal token read photos"
ON public.progress_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = progress_photos.client_id AND c.portal_token IS NOT NULL
  )
);

-- Anonymous insert for portal (client uploads)
CREATE POLICY "Portal can insert photos"
ON public.progress_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = progress_photos.client_id AND c.portal_token IS NOT NULL
  )
);

-- Create storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true);

-- Storage RLS: anyone can upload to progress-photos
CREATE POLICY "Anyone can upload progress photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'progress-photos');

-- Anyone can read progress photos
CREATE POLICY "Anyone can read progress photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'progress-photos');

-- Authenticated users can delete progress photos
CREATE POLICY "Auth users can delete progress photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'progress-photos' AND auth.uid() IS NOT NULL);
