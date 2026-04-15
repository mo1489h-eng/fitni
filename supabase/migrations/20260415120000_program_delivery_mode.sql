-- Online vs in-person program delivery (session mode UI for in_person)
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'online'
CHECK (delivery_mode IN ('online', 'in_person'));

COMMENT ON COLUMN public.programs.delivery_mode IS 'online: remote; in_person: trainer-led session mode';
