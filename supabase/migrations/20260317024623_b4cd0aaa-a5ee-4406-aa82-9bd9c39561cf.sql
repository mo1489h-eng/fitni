-- Remove direct client-side creation of match records to prevent self-granted access
DROP POLICY IF EXISTS "Authenticated can insert matches" ON public.client_matches;