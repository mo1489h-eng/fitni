
-- Fix 1: Restrict client_intakes SELECT to only matched trainers
-- Drop existing permissive SELECT policy if any, then create a restrictive one
DO $$
BEGIN
  -- Drop any existing SELECT policies on client_intakes for authenticated
  DROP POLICY IF EXISTS "Matched trainers can view intakes" ON public.client_intakes;
  DROP POLICY IF EXISTS "Trainers can view matched intakes" ON public.client_intakes;
END $$;

-- Create a proper SELECT policy: only trainers matched to the intake can read it
CREATE POLICY "Matched trainers can view intakes" ON public.client_intakes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_matches cm
    WHERE cm.intake_id = client_intakes.id
      AND cm.trainer_id = auth.uid()
  )
);

-- Fix 2: Allow clients to read vault_units belonging to their trainer
CREATE POLICY "Clients can read trainer vault units" ON public.vault_units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.auth_user_id = auth.uid()
      AND c.trainer_id = vault_units.trainer_id
  )
);
