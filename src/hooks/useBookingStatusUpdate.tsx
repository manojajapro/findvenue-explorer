
import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseConnection, updateBookingStatusInDatabase } from '@/utils/supabaseHealthCheck';
import { 
  sendNotification, 
  getVenueOwnerId, 
  sendBookingStatusNotification
} from '@/utils/notificationService';

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
      
      if (!result || !result.data) {
        throw new Error('Failed to update booking status in database');
      }
      
      // Update local state with the verified data
      setBookings(prev => 
        prev.map(b => 
          b.id === bookingId ? { ...b, ...result.data, updating: false } : b
        )
      );
      
      // Ensure the booking data includes all necessary fields for notifications
      const completeBookingData = {
        ...booking,
        ...result.data,
        status: status
      };
      
      // Send notifications to both venue owner and customer using a function with proper permissions
      console.log('Sending notifications for status update:', status);
      
      // Use the sendBookingStatusNotification function to handle notifications
      const notificationSent = await sendBookingStatusNotification(completeBookingData, status);
      
      if (!notificationSent) {
        console.warn('Notifications might not have been sent successfully.');
        toast({
          variant: "destructive",
          title: "Notification Warning",
          description: "Booking status updated, but notifications might be delayed.",
        });
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
  
  // Function to send notification to venue owner when a booking is created
  const notifyVenueOwner = async (booking: any) => {
    if (!booking) return;
    
    try {
      console.log('Sending notification to venue owner for booking:', booking);
      
      // Use the separate notification service function that handles permissions properly
      const notification = await sendNotification(
        await getVenueOwnerId(booking.venue_id),
        'New Booking Request',
        `A new booking request for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been received.`,
        'booking',
        '/customer-bookings',
        {
          booking_id: booking.id,
          venue_id: booking.venue_id,
          status: booking.status || 'pending',
          booking_date: booking.booking_date,
          venue_name: booking.venue_name,
          booking_type: booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly'
        }
      );
      
      if (!notification) {
        console.error('Failed to send notification to venue owner');
        return false;
      }
      
      console.log('Successfully sent notification to venue owner');
      
      // Also send a confirmation notification to the customer
      if (booking.user_id) {
        await sendNotification(
          booking.user_id,
          'Booking Requested',
          `Your booking request for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been sent to the venue owner.`,
          'booking',
          '/bookings',
          {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            status: booking.status || 'pending',
            booking_date: booking.booking_date,
            venue_name: booking.venue_name,
            booking_type: booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly'
          }
        );
      }
      
      return true;
    } catch (error) {
      console.error('Failed to notify venue owner about new booking:', error);
      return false;
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
