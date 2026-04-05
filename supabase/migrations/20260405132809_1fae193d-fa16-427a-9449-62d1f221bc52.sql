
-- meal_logs: Allow authenticated clients to INSERT their own records
CREATE POLICY "Clients can insert own meal logs"
ON public.meal_logs
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
  )
);

-- measurements: Allow authenticated clients to INSERT their own records
CREATE POLICY "Clients can insert own measurements"
ON public.measurements
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
  )
);

-- trainer_notifications: Allow trainers to INSERT notifications for their own clients
CREATE POLICY "Trainers can insert notifications for own clients"
ON public.trainer_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id = auth.uid()
);

-- Secure RPC for portal-based weight logging
CREATE OR REPLACE FUNCTION public.insert_portal_measurement(
  p_token text,
  p_weight numeric,
  p_fat_percentage numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_measurement_id uuid;
BEGIN
  IF p_weight < 20 OR p_weight > 500 THEN RAISE EXCEPTION 'Invalid weight value'; END IF;
  IF p_fat_percentage < 0 OR p_fat_percentage > 100 THEN RAISE EXCEPTION 'Invalid fat percentage'; END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  INSERT INTO public.measurements (client_id, weight, fat_percentage)
  VALUES (v_client_id, p_weight, p_fat_percentage)
  RETURNING id INTO v_measurement_id;

  RETURN v_measurement_id;
END;
$$;
