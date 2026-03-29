
-- Add founder columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_discount_used boolean NOT NULL DEFAULT false;

-- Update handle_new_user to auto-set is_founder for first 100 trainers
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_trainer_count integer;
  v_is_founder boolean;
BEGIN
  -- Count existing trainers
  SELECT count(*) INTO v_trainer_count FROM public.profiles;
  
  -- First 100 trainers are founders
  v_is_founder := (v_trainer_count < 100);
  
  INSERT INTO public.profiles (user_id, full_name, is_founder)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), v_is_founder);
  
  RETURN NEW;
END;
$function$;

-- Helper function to get founder stats
CREATE OR REPLACE FUNCTION public.get_founder_stats()
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_founders', (SELECT count(*) FROM public.profiles WHERE is_founder = true),
    'discount_used', (SELECT count(*) FROM public.profiles WHERE is_founder = true AND founder_discount_used = true),
    'discount_remaining', (SELECT count(*) FROM public.profiles WHERE is_founder = true AND founder_discount_used = false),
    'total_trainers', (SELECT count(*) FROM public.profiles),
    'spots_remaining', GREATEST(0, 100 - (SELECT count(*) FROM public.profiles))
  );
$$;
