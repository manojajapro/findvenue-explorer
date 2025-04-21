
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);
