-- Single payment provider: Tap. Rename legacy column and normalize payment_method.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_payments'
      AND column_name = 'moyasar_payment_id'
  ) THEN
    ALTER TABLE public.client_payments
      RENAME COLUMN moyasar_payment_id TO tap_charge_id;
  END IF;
END $$;

COMMENT ON COLUMN public.client_payments.tap_charge_id IS 'Tap charge id (from api.tap.company v2 charges)';

UPDATE public.client_payments
SET payment_method = 'tap'
WHERE payment_method IS NULL OR lower(trim(payment_method)) = 'moyasar';

ALTER TABLE public.client_payments
  ALTER COLUMN payment_method SET DEFAULT 'tap';
