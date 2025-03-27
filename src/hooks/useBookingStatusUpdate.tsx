
import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseConnection, updateBookingStatusInDatabase } from '@/utils/supabaseHealthCheck';

export const useBookingStatusUpdate = (fetchBookings: () => Promise<void>) => {
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  
  const updateBookingStatus = async (
    bookingId: string, 
    status: 'confirmed' | 'cancelled', 
    booking: any,
    setBookings: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    if (isBusy) {
      toast({
        title: 'Please wait',
        description: 'Another booking update is in progress...',
      });
      return;
    }
    
    setIsBusy(true);
    let retryCount = 0;
    const maxRetries = 3;
    
    try {
      if (!booking) throw new Error('Booking not found');
      
      console.log(`Updating booking ${bookingId} status to ${status}`);
      
      // Check Supabase connection before attempting update
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the database. Please check your connection and try again.');
      }
      
      // Show processing toast
      const processingToast = toast({
        title: 'Processing',
        description: `Updating booking status to ${status}...`,
      });
      
      let updateSuccess = false;
      let error = null;
      let result = null;
      
      while (retryCount < maxRetries && !updateSuccess) {
        try {
          // First check if the booking is already in the desired state
          const { data: currentBooking, error: checkError } = await supabase
            .from('bookings')
            .select('status')
            .eq('id', bookingId)
            .maybeSingle();
            
          if (checkError) {
            console.error('Error checking booking status:', checkError);
            throw checkError;
          }
            
          if (currentBooking?.status === status) {
            console.log(`Booking ${bookingId} is already in ${status} state`);
            updateSuccess = true;
            result = { success: true, data: currentBooking };
            break;
          }
          
          // Use the direct update function that includes verification
          result = await updateBookingStatusInDatabase(bookingId, status);
          
          if (result && result.success) {
            updateSuccess = true;
            console.log(`Database update successfully verified for booking ${bookingId}`);
            break;
          } else {
            throw new Error('Update verification failed');
          }
        } catch (e) {
          error = e;
          retryCount++;
          console.log(`Update attempt ${retryCount} failed:`, e);
          if (retryCount < maxRetries) {
            console.log(`Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!updateSuccess || !result) {
        throw error || new Error(`Failed to update booking status after ${maxRetries} attempts`);
      }
      
      // Update local state with the verified data
      setBookings(prev => 
        prev.map(b => 
          b.id === bookingId ? { ...b, ...result.data } : b
        )
      );
      
      // Send notification to customer - in a separate try-catch to not fail the main process
      try {
        const { error: notificationError } = await supabase
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
        
        if (notificationError) {
          console.error('Error sending notification:', notificationError);
          // Don't throw here, just log the error since the main update succeeded
        }
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Continue with success even if notification fails
      }
      
      // Dismiss the processing toast and show success
      processingToast.dismiss();
      toast({
        title: status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
        description: `The booking has been ${status} successfully.`,
      });
      
      // Fetch bookings again to ensure data is fresh
      await fetchBookings();
      
    } catch (error: any) {
      console.error(`Error updating booking status:`, error);
      
      toast({
        title: 'Update Failed',
        description: error.message || `Failed to update booking status.`,
        variant: 'destructive',
      });
      
      // Revert local state to original status
      setBookings(prev => 
        prev.map(b => 
          b.id === bookingId ? { ...b, status: booking.status } : b
        )
      );
    } finally {
      setIsBusy(false);
    }
  };
  
  return { updateBookingStatus, isBusy };
};
