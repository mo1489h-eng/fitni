-- Align profiles.role with client linkage: auth trigger may have created coach profiles for trainee users.
UPDATE public.profiles p
SET role = 'trainee'
WHERE EXISTS (
  SELECT 1 FROM public.clients c WHERE c.auth_user_id = p.user_id
)
AND p.role <> 'trainee';
