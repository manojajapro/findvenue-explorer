
import { supabase } from '@/integrations/supabase/client';

/**
 * Enables realtime functionality for a specific table
 * @param tableName Name of the table to enable realtime for
 * @returns Promise that resolves when the operation is complete
 */
export const enableRealtimeForTable = async (tableName: string): Promise<void> => {
  try {
    await supabase.rpc('enable_realtime_for_table', { table_name: tableName });
    console.log(`Realtime enabled for ${tableName}`);
  } catch (error) {
    console.error(`Failed to enable realtime for ${tableName}:`, error);
  }
};

/**
 * Sets up a realtime channel for a specific table with optional filters
 * @param channelName Name for the channel
 * @param table Table to listen to
 * @param event Event type (INSERT, UPDATE, DELETE, or *)
 * @param filter Optional filter expression
 * @param callback Function to call when an event occurs
 * @returns The channel object that can be used to unsubscribe
 */
export const setupRealtimeChannel = (
  channelName: string,
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter: string | null,
  callback: (payload: any) => void
) => {
  const channelConfig: {
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema: string;
    table: string;
    filter?: string;
  } = {
    event,
    schema: 'public',
    table,
  };

  if (filter) {
    channelConfig.filter = filter;
  }

  return supabase
    .channel(channelName)
    .on('postgres_changes', channelConfig, callback)
    .subscribe();
};
