
-- 1. Fix client_intakes: Add RESTRICTIVE SELECT policy denying anon
CREATE POLICY "Deny anon select on client_intakes"
ON public.client_intakes
AS RESTRICTIVE FOR SELECT TO anon
USING (false);

-- 2. Fix client_moods: Add INSERT/UPDATE/DELETE policies

-- Clients can insert their own mood records
CREATE POLICY "Clients can insert own moods"
ON public.client_moods
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.auth_user_id = auth.uid()
  )
);

-- Trainers can insert mood records for their clients
CREATE POLICY "Trainers can insert client moods"
ON public.client_moods
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.trainer_id = auth.uid()
  )
);

-- Clients can update their own mood records
CREATE POLICY "Clients can update own moods"
ON public.client_moods
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.auth_user_id = auth.uid()
  )
);

-- Trainers can update their clients' mood records
CREATE POLICY "Trainers can update client moods"
ON public.client_moods
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.trainer_id = auth.uid()
  )
);

-- Clients can delete their own mood records
CREATE POLICY "Clients can delete own moods"
ON public.client_moods
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.auth_user_id = auth.uid()
  )
);

-- Trainers can delete their clients' mood records
CREATE POLICY "Trainers can delete client moods"
ON public.client_moods
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_moods.client_id AND c.trainer_id = auth.uid()
  )
);
