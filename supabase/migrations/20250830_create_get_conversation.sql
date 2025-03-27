
-- Create a function to get conversation between two users
CREATE OR REPLACE FUNCTION public.get_conversation(current_user_id UUID, other_user_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  content TEXT,
  sender_id UUID,
  receiver_id UUID,
  read BOOLEAN,
  sender_name TEXT,
  receiver_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    id,
    created_at,
    content,
    sender_id,
    receiver_id,
    read,
    sender_name,
    receiver_name
  FROM messages
  WHERE (sender_id = current_user_id AND receiver_id = other_user_id)
     OR (sender_id = other_user_id AND receiver_id = current_user_id)
  ORDER BY created_at ASC;
$$;
