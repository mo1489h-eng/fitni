
-- AI Copilot recommendations table
CREATE TABLE public.copilot_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'program',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.copilot_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own recommendations"
  ON public.copilot_recommendations FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own recommendations"
  ON public.copilot_recommendations FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own recommendations"
  ON public.copilot_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own recommendations"
  ON public.copilot_recommendations FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Anonymous deny copilot_recommendations"
  ON public.copilot_recommendations FOR ALL
  TO anon
  USING (false);
