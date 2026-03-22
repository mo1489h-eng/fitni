
CREATE TABLE public.copilot_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  action_type text NOT NULL DEFAULT '',
  affected_resource text NOT NULL DEFAULT '',
  affected_resource_id uuid,
  before_state jsonb DEFAULT '{}'::jsonb,
  after_state jsonb DEFAULT '{}'::jsonb,
  confirmed_by_trainer boolean NOT NULL DEFAULT false,
  undone boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage own action logs"
ON public.copilot_action_logs
FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

CREATE INDEX idx_copilot_action_logs_trainer ON public.copilot_action_logs(trainer_id);
CREATE INDEX idx_copilot_action_logs_created ON public.copilot_action_logs(created_at DESC);
