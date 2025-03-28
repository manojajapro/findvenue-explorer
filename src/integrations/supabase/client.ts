
import { createClient } from '@supabase/supabase-js';

// Make sure environment variables are available and have fallback values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if URLs are available before creating the client
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and/or Anon Key are missing. Please check your environment variables.');
}

// Create the Supabase client with the available credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
