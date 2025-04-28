
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BlockedDateInfo {
  date: string;
  startTime: string | null;
  endTime: string | null;
}

export function useBlockedDates(venueId: string | undefined) {
  const [blockedDates, setBlockedDates] = useState<BlockedDateInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) return;

    const fetchBlockedDates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('blocked_dates')
          .select('date, start_time, end_time')
          .eq('venue_id', venueId);

        if (error) throw error;

        if (data) {
          // Format dates as objects with date, startTime and endTime
          const formattedDates = data.map(item => ({
            date: item.date,
            startTime: item.start_time,
            endTime: item.end_time
          }));
          setBlockedDates(formattedDates);
        }
      } catch (err: any) {
        console.error('Error fetching blocked dates:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedDates();

    const channel = supabase
      .channel('blocked_dates_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'blocked_dates', filter: `venue_id=eq.${venueId}` },
        () => fetchBlockedDates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  // Helper function to check if a date is blocked
  const isDateAndTimeBlocked = (date: Date, startTime?: string, endTime?: string): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const block = blockedDates.find(b => b.date === dateStr);
    
    if (!block) return false;
    
    // If the block has no time constraints, the entire day is blocked
    if (!block.startTime || !block.endTime) return true;
    
    // If checking just the date without time, return true if there's any block
    if (!startTime || !endTime) return true;
    
    // Check if the requested time slot overlaps with the blocked time slot
    return (
      startTime < block.endTime &&
      endTime > block.startTime
    );
  };
  
  // Simple function to check if date is blocked (without considering time)
  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDates.some(block => block.date === dateStr);
  };

  return {
    blockedDates: blockedDates.map(b => b.date), // Keep backward compatibility for components expecting just date strings
    rawBlockedDates: blockedDates, // Full blocked date info with time
    isLoading,
    error,
    isDateAndTimeBlocked,
    isDateBlocked
  };
}
