-- Remove direct client-side purchase creation. Purchases must be created only by trusted backend logic.
DROP POLICY IF EXISTS "Authenticated can purchase" ON public.marketplace_purchases;

-- Add a uniqueness guarantee for completed purchases to prevent duplicate completed records
-- for the same buyer/listing pair, even if backend logic is retried.
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_purchases_completed_unique_idx
ON public.marketplace_purchases (buyer_id, listing_id)
WHERE status = 'completed';