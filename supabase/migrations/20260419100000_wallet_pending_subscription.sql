-- Wallet: subscription credits (10% commission), pending 7-day clearing, trainer wallet on coach signup
-- Harmonize wallets column names with production (balance / total_earned) when legacy names exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'balance_available'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'balance'
  ) THEN
    ALTER TABLE public.wallets RENAME COLUMN balance_available TO balance;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'total_earnings'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'total_earned'
  ) THEN
    ALTER TABLE public.wallets RENAME COLUMN total_earnings TO total_earned;
  END IF;
END $$;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gross_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0;

-- Legacy inserts (some DBs use commission / net_amount)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_id_key
  ON public.transactions (reference_id)
  WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.increment_wallet_pending_earnings(
  p_trainer_id uuid,
  p_trainer_amount numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_trainer_id IS NULL OR p_trainer_amount IS NULL OR p_trainer_amount <= 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  UPDATE public.wallets
  SET
    pending_balance = pending_balance + p_trainer_amount,
    total_earned = total_earned + p_trainer_amount,
    updated_at = now()
  WHERE trainer_id = p_trainer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'لا توجد محفظة للمدرب';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_wallet_pending_earnings(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_wallet_pending_earnings(uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_wallet_available_credit(
  p_trainer_id uuid,
  p_net_amount numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_trainer_id IS NULL OR p_net_amount IS NULL OR p_net_amount <= 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  UPDATE public.wallets
  SET
    balance = balance + p_net_amount,
    total_earned = total_earned + p_net_amount,
    updated_at = now()
  WHERE trainer_id = p_trainer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'لا توجد محفظة للمدرب';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_wallet_available_credit(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_wallet_available_credit(uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.release_pending_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets w
  SET
    balance = w.balance + sub.ready_amount,
    pending_balance = w.pending_balance - sub.ready_amount,
    updated_at = now()
  FROM (
    SELECT
      trainer_id,
      SUM(amount) AS ready_amount
    FROM public.transactions
    WHERE
      status = 'pending'
      AND type = 'subscription'
      AND created_at <= now() - INTERVAL '7 days'
    GROUP BY trainer_id
  ) sub
  WHERE w.trainer_id = sub.trainer_id
    AND sub.ready_amount > 0;

  UPDATE public.transactions
  SET status = 'completed'
  WHERE
    status = 'pending'
    AND type = 'subscription'
    AND created_at <= now() - INTERVAL '7 days';
END;
$$;

REVOKE ALL ON FUNCTION public.release_pending_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_pending_balance() TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_trainer_count integer;
  v_is_founder boolean;
  v_role text;
  v_source text;
BEGIN
  SELECT count(*) INTO v_trainer_count FROM public.profiles;
  v_is_founder := (v_trainer_count < 100);

  v_source := NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'source', ''))), '');
  IF v_source IS NOT NULL AND v_source NOT IN ('landing', 'invite') THEN
    v_source := NULL;
  END IF;

  v_role := public.compute_profile_role(NEW.id);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role, source)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    v_is_founder,
    v_role,
    v_source
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role = 'coach' THEN
    INSERT INTO public.wallets (trainer_id, balance, pending_balance, total_earned)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (trainer_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO public.wallets (trainer_id, balance, pending_balance, total_earned)
SELECT p.user_id, 0, 0, 0
FROM public.profiles p
WHERE p.role = 'coach'
ON CONFLICT (trainer_id) DO NOTHING;

-- Withdrawals: use balance column name
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
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND email_verified = true
  ) THEN
    RAISE EXCEPTION 'يجب تأكيد بريدك الإلكتروني قبل طلب السحب';
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE trainer_id = auth.uid() FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'لا توجد محفظة';
  END IF;
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'المبلغ أكبر من الرصيد المتاح';
  END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE trainer_id = auth.uid() AND status IN ('pending','accepted')) THEN
    RAISE EXCEPTION 'يوجد طلب سحب قائم بالفعل';
  END IF;

  INSERT INTO public.withdrawals (trainer_id, amount, iban, bank_name, account_holder_name, status)
  VALUES (auth.uid(), p_amount, p_iban, p_bank_name, p_account_holder_name, 'pending');

  UPDATE public.wallets
  SET balance = balance - p_amount, pending_balance = pending_balance + p_amount, updated_at = now()
  WHERE trainer_id = auth.uid();
END;
$$;

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
  SELECT amount, trainer_id INTO v_amount, v_trainer FROM public.withdrawals WHERE id = p_withdrawal_id AND status = 'pending';
  IF v_trainer IS NULL OR v_trainer != auth.uid() THEN
    RAISE EXCEPTION 'لا يمكن إلغاء هذا الطلب';
  END IF;

  UPDATE public.withdrawals SET status = 'cancelled' WHERE id = p_withdrawal_id;
  UPDATE public.wallets
  SET balance = balance + v_amount, pending_balance = pending_balance - v_amount, updated_at = now()
  WHERE trainer_id = auth.uid();
END;
$$;
