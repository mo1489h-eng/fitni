-- Allow trainers to log sets and sessions on behalf of their clients (in-person / supervised sessions)

CREATE POLICY "Trainers can insert logs for their clients"
ON public.workout_logs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = workout_logs.client_id AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can update logs for their clients"
ON public.workout_logs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = workout_logs.client_id AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can insert sessions for their clients"
ON public.workout_sessions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = workout_sessions.client_id AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can update sessions for their clients"
ON public.workout_sessions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = workout_sessions.client_id AND c.trainer_id = auth.uid()
  )
);
