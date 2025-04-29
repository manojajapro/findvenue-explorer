
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export function useBlockedDates(venueId: string | undefined, selectedDate: Date | undefined, onDateSelect: (date: Date | undefined) => void) {
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch blocked dates from the blocked_dates table
  useEffect(() => {
    if (venueId) {
      const fetchBlockedDates = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('blocked_dates')
            .select('date')
            .eq('venue_id', venueId);
            
          if (error) {
            console.error('Error fetching blocked dates:', error);
            setBlockedDates([]);
            setIsLoading(false);
            return;
          }
          
          if (data && data.length > 0) {
            // Extract all blocked dates regardless of type
            const blocked = data.map(item => format(new Date(item.date), 'yyyy-MM-dd'));
            console.log("Blocked dates found in calendar component:", blocked);
            setBlockedDates(blocked);
            
            // If selected date is blocked, reset selection
            if (selectedDate && blocked.includes(format(selectedDate, 'yyyy-MM-dd'))) {
              console.log("Selected date is blocked in calendar, resetting selection");
              onDateSelect(undefined);
            }
          } else {
            console.log("No blocked dates found for venue:", venueId);
            setBlockedDates([]);
          }
        } catch (err) {
          console.error('Error processing blocked dates:', err);
          setBlockedDates([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchBlockedDates();
    }
  }, [venueId, selectedDate, onDateSelect]);

  // Helper function to check if a date is in a given array
  const isDateInArray = (date: Date, dateArray: string[]): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dateArray.includes(dateStr);
  };
  
  // Helper function to determine if a date is blocked by venue owner
  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDates.includes(dateStr);
  };
  
  return { 
    blockedDates,
    isLoading,
    isDateInArray,
    isDateBlocked
  };
}
