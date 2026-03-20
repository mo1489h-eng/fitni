
CREATE TABLE public.copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage own messages"
  ON public.copilot_messages
  FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE INDEX idx_copilot_messages_trainer ON public.copilot_messages(trainer_id, created_at DESC);
