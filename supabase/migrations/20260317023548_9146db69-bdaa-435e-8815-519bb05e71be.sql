
-- Fix 1: Restrict client_intakes SELECT to only matched trainers
DROP POLICY IF EXISTS "Trainers can read intakes" ON public.client_intakes;

CREATE POLICY "Trainers can read matched intakes"
ON public.client_intakes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_matches cm
    WHERE cm.intake_id = client_intakes.id
    AND cm.trainer_id = auth.uid()
  )
);

-- Fix 2: Restrict client_matches INSERT to authenticated only with condition
DROP POLICY IF EXISTS "System can insert matches" ON public.client_matches;

CREATE POLICY "Authenticated can insert matches"
ON public.client_matches FOR INSERT TO authenticated
WITH CHECK (trainer_id = auth.uid());
