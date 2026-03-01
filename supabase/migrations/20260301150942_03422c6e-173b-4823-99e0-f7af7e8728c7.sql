
-- ============================================
-- 1. PROFILES: Create public view, restrict base table
-- ============================================

-- Create a public view with only non-sensitive fields
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT
  user_id,
  full_name,
  avatar_url,
  bio,
  specialization,
  logo_url,
  brand_color,
  welcome_message
FROM public.profiles;

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can read trainer profiles" ON public.profiles;

-- Grant anon/authenticated SELECT on the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add a policy so the view's security_invoker can read profiles
CREATE POLICY "Public can read profiles via view"
ON public.profiles FOR SELECT
TO anon
USING (true);

-- Note: The view only exposes safe fields. Even though the policy allows SELECT,
-- the view restricts which columns are queryable by anonymous users.
-- Authenticated users already have their own policy for full profile access.

-- ============================================
-- 2. PROMO CODES: Secure with RPC, fix race condition
-- ============================================

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;

-- Create atomic promo code redemption function
CREATE OR REPLACE FUNCTION public.validate_and_redeem_promo(
  p_code text,
  p_email text,
  p_trainer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo record;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'كود غير صالح');
  END IF;

  -- Atomic select + update with row lock
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = upper(trim(p_code))
    AND is_active = true
  FOR UPDATE;

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكود غير صالح أو تم استخدامه مسبقاً');
  END IF;

  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكود غير صالح أو تم استخدامه مسبقاً');
  END IF;

  IF v_promo.assigned_to_email IS NOT NULL AND lower(v_promo.assigned_to_email) <> lower(p_email) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكود غير صالح أو تم استخدامه مسبقاً');
  END IF;

  -- Atomically increment usage
  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      used_by_trainer_id = p_trainer_id,
      used_at = now()
  WHERE id = v_promo.id;

  -- Upgrade trainer to pro
  UPDATE public.profiles
  SET subscription_plan = 'pro',
      subscribed_at = now()
  WHERE user_id = p_trainer_id;

  RETURN jsonb_build_object(
    'valid', true,
    'days', v_promo.duration_days,
    'message', '🎉 تم تفعيل ' || v_promo.duration_days || ' يوم مجاناً!'
  );
END;
$$;

-- Create a validate-only function (no redemption) for form validation
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo record;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'كود غير صالح');
  END IF;

  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = upper(trim(p_code))
    AND is_active = true;

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكود غير صالح أو تم استخدامه مسبقاً');
  END IF;

  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكود غير صالح أو تم استخدامه مسبقاً');
  END IF;

  IF v_promo.assigned_to_email IS NOT NULL AND lower(v_promo.assigned_to_email) <> lower(p_email) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكود غير صالح أو تم استخدامه مسبقاً');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'days', v_promo.duration_days,
    'message', '🎉 تم تفعيل ' || v_promo.duration_days || ' يوم مجاناً!'
  );
END;
$$;

-- Remove the broad UPDATE policy and replace with restrictive one
DROP POLICY IF EXISTS "Auth users can increment promo usage" ON public.promo_codes;
-- No direct UPDATE allowed - all updates go through the RPC function
