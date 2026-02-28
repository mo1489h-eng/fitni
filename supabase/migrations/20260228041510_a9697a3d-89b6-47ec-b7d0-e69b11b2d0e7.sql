
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  duration_days integer NOT NULL DEFAULT 30,
  max_uses integer NOT NULL DEFAULT 100,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active promo codes (needed during registration before auth)
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Insert sample promo codes
INSERT INTO public.promo_codes (code, duration_days, max_uses) VALUES
  ('FITNI30', 30, 100),
  ('FITNI90', 90, 100),
  ('BETA2024', 90, 50);
