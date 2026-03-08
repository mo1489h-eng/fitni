
-- Trainer payment settings (IBAN, bank info)
CREATE TABLE public.trainer_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL UNIQUE,
  iban text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_holder_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage own payment settings"
ON public.trainer_payment_settings FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Trainer packages
CREATE TABLE public.trainer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  sessions_per_week integer NOT NULL DEFAULT 0,
  includes_program boolean NOT NULL DEFAULT true,
  includes_nutrition boolean NOT NULL DEFAULT true,
  includes_followup boolean NOT NULL DEFAULT true,
  custom_features text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active packages"
ON public.trainer_packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Trainers can manage own packages"
ON public.trainer_packages FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Payout requests
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  iban text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_holder_name text NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notes text
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage own payout requests"
ON public.payout_requests FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Add username to profiles for public payment links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
