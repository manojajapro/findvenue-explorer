
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createSupabaseClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);
