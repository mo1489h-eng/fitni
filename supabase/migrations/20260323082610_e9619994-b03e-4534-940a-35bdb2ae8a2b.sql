
CREATE TABLE public.nps_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  comment text,
  trigger_type text NOT NULL DEFAULT 'trial_end',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can insert own NPS feedback"
  ON public.nps_feedback FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can read own NPS feedback"
  ON public.nps_feedback FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());
