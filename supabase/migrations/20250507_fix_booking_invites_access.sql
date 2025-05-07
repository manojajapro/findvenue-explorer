
-- Enable Row Level Security
ALTER TABLE public.booking_invites ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for reading booking invites
CREATE POLICY "Allow anonymous access to booking invites" ON public.booking_invites
FOR SELECT USING (true);

-- Allow anonymous access for updating booking invites
CREATE POLICY "Allow anonymous users to update booking invites" ON public.booking_invites
FOR UPDATE USING (true);

-- Allow service role to insert/update booking invites
CREATE POLICY "Allow service role to manage invites" ON public.booking_invites
FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to update invites
CREATE POLICY "Allow users to update own invites" ON public.booking_invites
FOR UPDATE USING (auth.uid() IS NOT NULL);
