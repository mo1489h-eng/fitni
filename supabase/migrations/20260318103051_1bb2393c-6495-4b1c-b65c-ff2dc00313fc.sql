-- Remove legacy public-role policies on trainer_sessions and replace with a single authenticated-only policy
DROP POLICY IF EXISTS "Trainers can delete own sessions" ON public.trainer_sessions;
DROP POLICY IF EXISTS "Trainers can insert own sessions" ON public.trainer_sessions;
DROP POLICY IF EXISTS "Trainers can read own sessions" ON public.trainer_sessions;
DROP POLICY IF EXISTS "Trainers can update own sessions" ON public.trainer_sessions;
DROP POLICY IF EXISTS "Trainers can manage own sessions" ON public.trainer_sessions;

CREATE POLICY "Trainers can manage own sessions"
ON public.trainer_sessions
FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());