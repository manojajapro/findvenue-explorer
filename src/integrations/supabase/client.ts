
import { createClient } from '@supabase/supabase-js';

// To ensure we have valid values for the Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Throw a more meaningful error if environment variables are missing
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable. Please add it to your .env file.');
}

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env file.');
}

// Initialize the Supabase client - using non-empty placeholders to avoid runtime errors
// These placeholders will allow the app to render, but Supabase operations will fail gracefully
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
