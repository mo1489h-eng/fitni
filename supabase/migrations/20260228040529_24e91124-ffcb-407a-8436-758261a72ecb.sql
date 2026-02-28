
CREATE TABLE public.measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 0,
  fat_percentage numeric NOT NULL DEFAULT 0,
  recorded_at date NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read client measurements"
  ON public.measurements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = measurements.client_id AND c.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can insert client measurements"
  ON public.measurements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = measurements.client_id AND c.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can delete client measurements"
  ON public.measurements FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = measurements.client_id AND c.trainer_id = auth.uid()
  ));

CREATE POLICY "Portal token read measurements"
  ON public.measurements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = measurements.client_id AND c.portal_token IS NOT NULL
  ));
