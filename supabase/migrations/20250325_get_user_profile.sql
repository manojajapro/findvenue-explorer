
-- Function to get a user profile by ID, bypassing TypeScript's table limitations
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS SETOF public.user_profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.user_profiles WHERE id = user_id;
$$;
