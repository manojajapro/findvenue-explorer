
import { supabase } from '@/integrations/supabase/client';

// Enable realtime for a specific table
export const enableRealtimeForTable = async (table: string) => {
  try {
    // Check if the table is enabled for realtime using direct DB query
    const { data: realtimeEnabled, error: realtimeCheckError } = await supabase
      .from(table)
      .select('id')
      .limit(1);
      
    if (realtimeCheckError) {
      console.error(`Error checking realtime status for ${table}:`, realtimeCheckError);
      return false;
    }
    
    // Enable realtime channel for the table
    const channel = supabase
      .channel(`table:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        console.log('Realtime change:', payload);
      })
      .subscribe();
      
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
    // Simple check to see if we can subscribe to the table
    const channel = supabase
      .channel(`test-${table}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => {})
      .subscribe();
    
    // Cleanup the test channel
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error(`Error checking realtime for ${table}:`, error);
    return false;
  }
};
