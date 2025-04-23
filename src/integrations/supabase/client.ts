
import { createClient } from '@supabase/supabase-js';

// You may replace these URLs/keys with those specific to your Supabase project if not working.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);
