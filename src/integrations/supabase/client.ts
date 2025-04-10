
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Initialize the Supabase client with the project URL and key
export const supabase = createSupabaseClient<Database>(
  'https://esdmelfzeszjtbnoajig.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94'
);
