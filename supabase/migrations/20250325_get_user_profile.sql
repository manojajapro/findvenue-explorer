
-- Function to get a user profile by ID, bypassing TypeScript's table limitations
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS SETOF public.user_profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.user_profiles WHERE id = user_id;
$$;

-- Function to get messages for a specific conversation
CREATE OR REPLACE FUNCTION public.get_conversation(current_user_id UUID, other_user_id UUID)
RETURNS SETOF public.messages
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.messages 
  WHERE (sender_id = current_user_id AND receiver_id = other_user_id)
     OR (sender_id = other_user_id AND receiver_id = current_user_id)
  ORDER BY created_at ASC;
$$;
