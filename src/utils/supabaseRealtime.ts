
import { supabase } from '@/integrations/supabase/client';

// Enable realtime for a specific table
export const enableRealtimeForTable = async (table: string) => {
  try {
    // Check first if the table is already in the publication
    const { data, error } = await supabase
      .from('supabase_realtime')
      .select('*')
      .eq('table', table)
      .single();
      
    if (!error && data) {
      console.log(`Table ${table} is already enabled for realtime`);
      return true;
    }
    
    // Add the table to the realtime publication
    await supabase.rpc('enable_realtime_for_table', { table_name: table });
    console.log(`Enabled realtime for table: ${table}`);
    return true;
  } catch (error) {
    console.error(`Error enabling realtime for ${table}:`, error);
    return false;
  }
};

// Create a function to check if a table is enabled for realtime
export const isTableRealtimeEnabled = async (table: string) => {
  try {
    const { data, error } = await supabase
      .rpc('is_table_realtime_enabled', { table_name: table });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error checking realtime for ${table}:`, error);
    return false;
  }
};
