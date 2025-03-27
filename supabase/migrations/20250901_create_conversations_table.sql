
-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participants UUID[] NOT NULL,
  venue_id UUID REFERENCES public.venues(id),
  venue_name TEXT,
  last_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Row Level Security to conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to select conversations they are part of
CREATE POLICY "Users can view their own conversations" 
  ON public.conversations 
  FOR SELECT 
  USING (auth.uid() = ANY(participants));

-- Create policy for users to insert conversations they are part of
CREATE POLICY "Users can create conversations they are part of" 
  ON public.conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = ANY(participants));

-- Create policy for users to update conversations they are part of
CREATE POLICY "Users can update their own conversations" 
  ON public.conversations 
  FOR UPDATE 
  USING (auth.uid() = ANY(participants));

-- Enable realtime for messages and conversations tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Set replica identity to full for realtime updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
