-- Idempotent Tap → trainer wallet credits (platform collects full charge; earnings via add_transaction)
CREATE TABLE IF NOT EXISTS public.tap_wallet_settlements (
  tap_charge_id text PRIMARY KEY,
  trainer_id uuid NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('program_sale', 'subscription')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tap_wallet_settlements_trainer_id_idx ON public.tap_wallet_settlements (trainer_id);

ALTER TABLE public.tap_wallet_settlements ENABLE ROW LEVEL SECURITY;
