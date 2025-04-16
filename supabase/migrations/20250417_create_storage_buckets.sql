
-- Create storage buckets for user avatars and venue images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('user_avatars', 'User profile avatars', true),
  ('venue_images', 'Venue image gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for user_avatars bucket
CREATE POLICY "Allow public read access on user avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user_avatars');

CREATE POLICY "Allow authenticated users to upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user_avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'user_avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Set up security policies for venue_images bucket
CREATE POLICY "Allow public read access on venue images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue_images');

CREATE POLICY "Allow authenticated users to upload venue images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'venue_images');

CREATE POLICY "Allow venue owners to update their venue images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'venue_images');

CREATE POLICY "Allow venue owners to delete their venue images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'venue_images');
