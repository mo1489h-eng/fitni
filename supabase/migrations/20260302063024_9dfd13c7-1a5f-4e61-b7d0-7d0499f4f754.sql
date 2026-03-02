
-- Add billing_cycle to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';

-- Create client_payments table
CREATE TABLE public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  payment_method text DEFAULT 'moyasar',
  moyasar_payment_id text,
  status text NOT NULL DEFAULT 'pending',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- RLS: Trainers can CRUD their own client payments
CREATE POLICY "Trainers can read own client payments" ON public.client_payments
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own client payments" ON public.client_payments
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own client payments" ON public.client_payments
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own client payments" ON public.client_payments
  FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- Clients can read own payments
CREATE POLICY "Clients can read own payments" ON public.client_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = client_payments.client_id AND c.auth_user_id = auth.uid()
  ));

-- Deny anonymous
CREATE POLICY "Anonymous deny client_payments" ON public.client_payments
  AS RESTRICTIVE FOR ALL TO anon
  USING (false);
