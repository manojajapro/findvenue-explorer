
import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

export const supabase = supabaseCreateClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);
