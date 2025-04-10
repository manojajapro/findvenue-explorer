
import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://esdmelfzeszjtbnoajig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94';

export const supabase = supabaseCreateClient(supabaseUrl, supabaseKey);
