-- Pre-payment invite signup: store encrypted password server-side until Tap CAPTURED.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS pending_reg_full_name text,
  ADD COLUMN IF NOT EXISTS pending_reg_password_enc text,
  ADD COLUMN IF NOT EXISTS pending_reg_phone text;

COMMENT ON COLUMN public.clients.pending_reg_full_name IS 'Invite checkout: name before account creation.';
COMMENT ON COLUMN public.clients.pending_reg_password_enc IS 'AES-GCM (base64); decrypted only in complete-trainee-registration-payment (Edge).';
COMMENT ON COLUMN public.clients.pending_reg_phone IS 'Invite checkout: phone captured before payment.';
