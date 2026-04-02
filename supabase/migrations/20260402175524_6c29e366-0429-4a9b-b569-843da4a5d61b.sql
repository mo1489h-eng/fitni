
CREATE OR REPLACE FUNCTION public.update_portal_privacy(
  p_token TEXT,
  p_privacy_weight BOOLEAN,
  p_privacy_photos BOOLEAN,
  p_privacy_scans BOOLEAN,
  p_privacy_achievements BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clients
  SET privacy_weight = p_privacy_weight,
      privacy_photos = p_privacy_photos,
      privacy_scans = p_privacy_scans,
      privacy_achievements = p_privacy_achievements
  WHERE portal_token = p_token
    AND portal_token_expires_at > now();
END;
$$;
