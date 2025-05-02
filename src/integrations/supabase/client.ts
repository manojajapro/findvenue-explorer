
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);
