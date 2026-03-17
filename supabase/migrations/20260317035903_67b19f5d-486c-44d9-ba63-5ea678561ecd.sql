
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, bio text, specialization text, logo_url text, brand_color text, welcome_message text, title text, social_links jsonb, gallery_images text[], username text, page_config jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.bio, p.specialization,
         p.logo_url, p.brand_color, p.welcome_message, p.title, p.social_links, p.gallery_images, p.username, p.page_config
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_trainer_by_username(p_username text)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, bio text, specialization text, logo_url text, brand_color text, welcome_message text, title text, social_links jsonb, gallery_images text[], username text, page_config jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.bio, p.specialization,
         p.logo_url, p.brand_color, p.welcome_message, p.title, p.social_links, p.gallery_images, p.username, p.page_config
  FROM public.profiles p
  WHERE p.username = lower(p_username) AND p.username IS NOT NULL
  LIMIT 1;
$$;
