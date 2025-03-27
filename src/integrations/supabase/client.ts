
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://esdmelfzeszjtbnoajig.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
