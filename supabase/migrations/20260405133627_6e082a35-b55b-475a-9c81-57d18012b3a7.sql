
-- Add category column to marketplace_listings
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Create marketplace_reviews table
CREATE TABLE public.marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  reviewer_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, reviewer_id)
);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
ON public.marketplace_reviews FOR SELECT TO anon, authenticated
USING (true);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can insert own reviews"
ON public.marketplace_reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid()::text);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.marketplace_reviews FOR UPDATE TO authenticated
USING (reviewer_id = auth.uid()::text)
WITH CHECK (reviewer_id = auth.uid()::text);

-- Function to update listing rating aggregates
CREATE OR REPLACE FUNCTION public.update_listing_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.marketplace_reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)),
      rating_count = (SELECT COUNT(*) FROM public.marketplace_reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id))
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_listing_rating
AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_listing_rating();
