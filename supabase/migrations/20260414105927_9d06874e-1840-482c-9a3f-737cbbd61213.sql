-- Allow clients to read vault lessons from their trainer
CREATE POLICY "Clients can read trainer vault lessons"
ON public.vault_lessons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vault_units vu
    JOIN public.clients c ON c.trainer_id = vu.trainer_id
    WHERE vu.id = vault_lessons.unit_id
      AND c.auth_user_id = auth.uid()
  )
);