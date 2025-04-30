
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface BlockedDate {
  id: string;
  venue_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_full_day: boolean;
  reason: string | null;
  created_at: string;
  created_by: string;
}

export const useBlockedDates = (venueId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockedDatesStrings, setBlockedDatesStrings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      if (!venueId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('blocked_dates')
          .select('*')
          .eq('venue_id', venueId);
        
        if (error) throw error;
        
        setBlockedDates(data || []);
        
        // Create a list of blocked date strings in 'yyyy-MM-dd' format
        const dateStrings = (data || []).map(item => item.date);
        setBlockedDatesStrings(dateStrings);
        
      } catch (err: any) {
        console.error('Error fetching blocked dates:', err);
        setError(err.message || 'Failed to load blocked dates');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBlockedDates();
    
    // Set up realtime subscription for blocked dates
    const channel = supabase
      .channel('blocked_dates_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'blocked_dates',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        fetchBlockedDates();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDatesStrings.includes(dateStr);
  };

  const blockDate = async (date: Date, fullDay: boolean = true, reason: string = ''): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to block dates.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check if there are any bookings for this date first
      const { data: existingBookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('venue_id', venueId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);
        
      if (bookingError) throw bookingError;
      
      // Cannot block a date with existing bookings
      if (existingBookings && existingBookings.length > 0) {
        toast({
          title: "Cannot block this date",
          description: "There are existing bookings for this date.",
          variant: "destructive",
        });
        return false;
      }
      
      const { error } = await supabase
        .from('blocked_dates')
        .insert([
          {
            venue_id: venueId,
            date: dateStr,
            start_time: fullDay ? null : '00:00',
            end_time: fullDay ? null : '23:59',
            is_full_day: fullDay,
            reason,
            created_by: user.id
          }
        ]);
        
      if (error) {
        console.error("Error blocking date:", error);
        throw error;
      }
      
      toast({
        title: "Date blocked",
        description: `${format(date, 'PPP')} has been blocked successfully.`,
        variant: "default",
      });
      
      return true;
    } catch (err: any) {
      console.error('Error blocking date:', err);
      setError(err.message || 'Failed to block date');
      toast({
        title: "Failed to block date",
        description: err.message || "An error occurred while blocking the date.",
        variant: "destructive",
      });
      return false;
    }
  };

  const unblockDate = async (date: Date): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to unblock dates.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('venue_id', venueId)
        .eq('date', dateStr);
        
      if (error) throw error;
      
      toast({
        title: "Date unblocked",
        description: `${format(date, 'PPP')} has been unblocked successfully.`,
        variant: "default",
      });
      
      return true;
    } catch (err: any) {
      console.error('Error unblocking date:', err);
      setError(err.message || 'Failed to unblock date');
      toast({
        title: "Failed to unblock date",
        description: err.message || "An error occurred while unblocking the date.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    blockedDates,
    blockedDatesStrings,
    isLoading,
    error,
    isDateBlocked,
    blockDate,
    unblockDate
  };
};
