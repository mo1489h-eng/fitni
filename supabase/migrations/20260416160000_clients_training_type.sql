-- Dual training mode per client: in-person (trainer Session Mode) vs online.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS training_type text NOT NULL DEFAULT 'online'
  CHECK (training_type IN ('in_person', 'online'));

COMMENT ON COLUMN public.clients.training_type IS 'in_person: trainer-led Session Mode; online: remote client flow';

-- Backfill from legacy client_type where present
UPDATE public.clients
SET training_type = 'in_person'
WHERE client_type = 'in_person' AND training_type = 'online';
