import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseConnection, updateBookingStatusInDatabase } from '@/utils/supabaseHealthCheck';
import { notifyVenueOwnerAboutBooking } from '@/utils/notificationService';

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
      
      // Immediately update local state to improve perceived performance
      setBookings(prev => 
        prev.map(b => 
          b.id === bookingId ? { ...b, status, updating: true } : b
        )
      );
      
      // Perform the actual update
      const result = await updateBookingStatusInDatabase(bookingId, status);
      
      // Update local state with the verified data
      setBookings(prev => 
        prev.map(b => 
          b.id === bookingId ? { ...b, ...result.data, updating: false } : b
        )
      );
      
      // Send notification to customer
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
        } else {
          console.log('Notification sent successfully to customer');
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
          b.id === bookingId ? { ...b, status: booking.status, updating: false } : b
        )
      );
    } finally {
      setIsBusy(false);
    }
  };
  
  // Add function to send notification to venue owner when a booking is created
  const notifyVenueOwner = async (booking: any) => {
    if (!booking) return;
    
    try {
      console.log('Sending notification to venue owner for booking:', booking);
      
      // Use our notifyVenueOwnerAboutBooking function from notificationService
      const result = await notifyVenueOwnerAboutBooking(booking);
      
      if (result) {
        console.log('Successfully sent notification to venue owner:', result);
      } else {
        console.error('Failed to send notification to venue owner');
      }
      
      // Also send a confirmation notification to the customer
      const { error: customerNotificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          title: 'Booking Requested',
          message: `Your booking request for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been sent to the venue owner.`,
          type: 'booking',
          read: false,
          link: '/bookings',
          data: {
            booking_id: booking.id,
            venue_id: booking.venue_id
          }
        });
      
      if (customerNotificationError) {
        console.error('Error sending notification to customer:', customerNotificationError);
      } else {
        console.log('Booking confirmation notification sent to customer');
      }
    } catch (error) {
      console.error('Failed to notify venue owner about new booking:', error);
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
