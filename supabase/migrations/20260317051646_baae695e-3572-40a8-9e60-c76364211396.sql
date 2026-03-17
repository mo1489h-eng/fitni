
-- Drop old function first (return type changed)
DROP FUNCTION IF EXISTS public.get_client_by_portal_token(text);

-- Recreate with restricted fields only
CREATE FUNCTION public.get_client_by_portal_token(p_token text)
RETURNS TABLE(
  id uuid, name text, trainer_id uuid, goal text, portal_token text,
  program_id uuid, week_number integer,
  subscription_price numeric, subscription_end_date date, billing_cycle text,
  privacy_weight boolean, privacy_photos boolean, privacy_scans boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.trainer_id, c.goal, c.portal_token,
         c.program_id, c.week_number,
         c.subscription_price, c.subscription_end_date, c.billing_cycle,
         c.privacy_weight, c.privacy_photos, c.privacy_scans
  FROM public.clients c
  WHERE c.portal_token = p_token
    AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  LIMIT 1;
$$;

-- Fix progress_photos policies from public to authenticated
DROP POLICY IF EXISTS "Trainers can delete client photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Trainers can insert client photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Trainers can read client photos" ON public.progress_photos;

CREATE POLICY "Trainers can delete client photos" ON public.progress_photos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = progress_photos.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert client photos" ON public.progress_photos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = progress_photos.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can read client photos" ON public.progress_photos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = progress_photos.client_id AND c.trainer_id = auth.uid()));

-- Fix gulf_foods INSERT policy (RLS always true)
DROP POLICY IF EXISTS "Authenticated can add foods" ON public.gulf_foods;
CREATE POLICY "Authenticated can add foods" ON public.gulf_foods
  FOR INSERT TO authenticated
  WITH CHECK (added_by_trainer_id = auth.uid());
