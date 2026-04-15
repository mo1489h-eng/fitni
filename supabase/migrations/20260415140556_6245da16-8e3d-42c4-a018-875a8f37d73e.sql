
-- Add missing columns to programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'online';
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS equipment text NOT NULL DEFAULT '';

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL UNIQUE,
  balance_available numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can read own wallet" ON public.wallets FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Service role full access wallets" ON public.wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'subscription',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  description text,
  status text NOT NULL DEFAULT 'completed',
  reference_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can read own transactions" ON public.transactions FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Service role full access transactions" ON public.transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  iban text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_holder_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can insert own withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Service role full access withdrawals" ON public.withdrawals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create request_withdrawal RPC
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_iban text,
  p_bank_name text,
  p_account_holder_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT balance_available INTO v_balance FROM wallets WHERE trainer_id = auth.uid() FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'لا توجد محفظة';
  END IF;
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'المبلغ أكبر من الرصيد المتاح';
  END IF;
  IF EXISTS (SELECT 1 FROM withdrawals WHERE trainer_id = auth.uid() AND status IN ('pending','accepted')) THEN
    RAISE EXCEPTION 'يوجد طلب سحب قائم بالفعل';
  END IF;

  INSERT INTO withdrawals (trainer_id, amount, iban, bank_name, account_holder_name, status)
  VALUES (auth.uid(), p_amount, p_iban, p_bank_name, p_account_holder_name, 'pending');

  UPDATE wallets SET balance_available = balance_available - p_amount, pending_balance = pending_balance + p_amount, updated_at = now()
  WHERE trainer_id = auth.uid();
END;
$$;

-- Create cancel_withdrawal RPC
CREATE OR REPLACE FUNCTION public.cancel_withdrawal(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_trainer uuid;
BEGIN
  SELECT amount, trainer_id INTO v_amount, v_trainer FROM withdrawals WHERE id = p_withdrawal_id AND status = 'pending';
  IF v_trainer IS NULL OR v_trainer != auth.uid() THEN
    RAISE EXCEPTION 'لا يمكن إلغاء هذا الطلب';
  END IF;

  UPDATE withdrawals SET status = 'cancelled' WHERE id = p_withdrawal_id;
  UPDATE wallets SET balance_available = balance_available + v_amount, pending_balance = pending_balance - v_amount, updated_at = now()
  WHERE trainer_id = auth.uid();
END;
$$;
