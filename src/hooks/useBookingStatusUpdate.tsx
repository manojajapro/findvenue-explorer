
import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useBookingStatusUpdate = (fetchBookings: () => Promise<void>) => {
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  
  const updateBookingStatus = async (
    bookingId: string, 
    status: 'confirmed' | 'cancelled', 
    booking: any,
    setBookings: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    setIsBusy(true);
    try {
      if (!booking) throw new Error('Booking not found');
      
      console.log(`Updating booking ${bookingId} status to ${status}`);
      
      // First, update the booking status in the database
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);
        
      if (error) {
        console.error('Error updating booking status:', error);
        throw error;
      }
      
      // Immediately update local state to show the change
      setBookings(prev => 
        prev.map(b => 
          b.id === bookingId ? { ...b, status } : b
        )
      );
      
      // Send notification to customer
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          title: status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
          message: status === 'confirmed' 
            ? `Your booking for ${booking.venue_name} on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been confirmed.`
            : `Your booking for ${booking.venue_name} on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been cancelled by the venue owner.`,
          type: 'booking',
          read: false,
          link: '/bookings',
          data: {
            booking_id: bookingId,
            venue_id: booking.venue_id
          }
        });
      
      toast({
        title: status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
        description: `The booking has been ${status} successfully.`,
      });
      
      console.log('Booking status updated successfully');
      
      // Fetch bookings again to ensure data is fresh
      await fetchBookings();
      
    } catch (error: any) {
      console.error(`Error updating booking status:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to update booking status.`,
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };
  
  return { updateBookingStatus, isBusy };
};
