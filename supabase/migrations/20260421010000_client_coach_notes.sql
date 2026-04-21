-- Coach-authored notes about a client, shown on the client compliance tab.
CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_notes_client_created_idx
  ON public.client_notes (client_id, created_at DESC);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers manage notes for own clients"
  ON public.client_notes;
CREATE POLICY "Trainers manage notes for own clients"
  ON public.client_notes FOR ALL TO authenticated
  USING (
    trainer_id = auth.uid()
    AND client_id IN (
      SELECT id FROM public.clients WHERE trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    trainer_id = auth.uid()
    AND client_id IN (
      SELECT id FROM public.clients WHERE trainer_id = auth.uid()
    )
  );
