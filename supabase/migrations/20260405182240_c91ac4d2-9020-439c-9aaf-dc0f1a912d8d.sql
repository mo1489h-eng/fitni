
ALTER TABLE public.vault_units
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS lock_type text NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS lock_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lock_after_unit_id uuid REFERENCES public.vault_units(id) ON DELETE SET NULL;
