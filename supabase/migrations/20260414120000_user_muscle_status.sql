-- Per-client muscle fatigue / linear recovery state (synced from workout sessions)

CREATE TABLE IF NOT EXISTS public.user_muscle_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  muscle_group text NOT NULL CHECK (
    muscle_group IN ('chest', 'back', 'shoulders', 'arms', 'core', 'legs')
  ),
  initial_fatigue double precision NOT NULL CHECK (initial_fatigue >= 0 AND initial_fatigue <= 1),
  total_recovery_hours double precision NOT NULL CHECK (total_recovery_hours > 0),
  last_stimulus_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, muscle_group)
);

CREATE INDEX IF NOT EXISTS idx_user_muscle_status_client ON public.user_muscle_status(client_id);

ALTER TABLE public.user_muscle_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own muscle status"
  ON public.user_muscle_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = user_muscle_status.client_id AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = user_muscle_status.client_id AND c.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers read client muscle status"
  ON public.user_muscle_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = user_muscle_status.client_id AND c.trainer_id = auth.uid()
    )
  );
