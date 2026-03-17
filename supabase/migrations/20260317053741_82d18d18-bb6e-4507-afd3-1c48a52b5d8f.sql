
-- Fix trainer_sessions policies: change from public to authenticated
DROP POLICY IF EXISTS "Trainers can manage own sessions" ON public.trainer_sessions;

CREATE POLICY "Trainers can manage own sessions" ON public.trainer_sessions
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
