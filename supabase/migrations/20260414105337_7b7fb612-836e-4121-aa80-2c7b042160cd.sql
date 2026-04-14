-- Allow clients to read their own nutrition targets
CREATE POLICY "Clients can read own nutrition targets"
ON public.nutrition_targets
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
  )
);