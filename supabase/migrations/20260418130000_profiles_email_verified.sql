-- App-level email verification flag (independent of blocking login).
-- Synced from auth.users when email_confirmed_at is set; used for sensitive actions (e.g. withdrawals).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.email_verified IS
  'When true, user completed email verification (synced from auth or future flows). Used for finance-sensitive actions.';

-- Backfill from Supabase Auth (existing confirmed users)
UPDATE public.profiles p
SET email_verified = true
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email_confirmed_at IS NOT NULL;

-- Keep profiles.email_verified aligned with auth confirmation state for the current user
CREATE OR REPLACE FUNCTION public.sync_profile_email_verification_from_auth()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_confirmed boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT (email_confirmed_at IS NOT NULL) INTO v_confirmed
  FROM auth.users
  WHERE id = uid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET email_verified = v_confirmed
  WHERE user_id = uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_email_verification_from_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_profile_email_verification_from_auth() TO authenticated;

-- Require verified email profile flag before withdrawal (defense in depth with UI)
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
