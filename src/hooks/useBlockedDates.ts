
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function useBlockedDates(venueId: string | undefined) {
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
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
          .select('date')
          .eq('venue_id', venueId);

        if (error) throw error;

        if (data) {
          // Format dates as 'yyyy-MM-dd' strings
          const formattedDates = data.map(item => item.date);
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

    // Subscribe to changes in the blocked_dates table
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
  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDates.includes(dateStr);
  };

  return {
    blockedDates,
    isLoading,
    error,
    isDateBlocked
  };
}
