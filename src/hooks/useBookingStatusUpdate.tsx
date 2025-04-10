
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
      
      // Send notifications to both venue owner and customer
      console.log('Sending notifications for status update:', status);
      const notificationSent = await sendBookingStatusNotification(completeBookingData, status);
      
      if (!notificationSent) {
        console.warn('Notifications might not have been sent properly');
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
      
      // First notify venue owner
      // Get venue owner ID directly
      const ownerId = await getVenueOwnerId(booking.venue_id);
      
      if (!ownerId) {
        console.error('Could not find venue owner ID for venue', booking.venue_id);
        toast({
          variant: "destructive",
          title: "Notification Warning",
          description: "Your booking was created, but the venue owner might not be notified immediately.",
        });
        return;
      }
      
      console.log(`Sending notification to owner ${ownerId}`);
      
      // Send notification to venue owner
      const ownerNotification = await sendNotification(
        ownerId,
        'New Booking Request',
        `A new booking request for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been received.`,
        'booking',
        '/customer-bookings',
        {
          booking_id: booking.id,
          venue_id: booking.venue_id,
          status: 'pending',
          booking_date: booking.booking_date,
          venue_name: booking.venue_name
        },
        5
      );
      
      if (!ownerNotification) {
        console.error('Failed to send notification to venue owner');
        toast({
          variant: "destructive",
          title: "Notification Warning",
          description: "Your booking was created, but the venue owner might not be notified immediately.",
        });
      } else {
        console.log('Successfully sent notification to venue owner');
      }
      
      // Also send a confirmation notification to the customer
      if (booking.user_id) {
        console.log(`Sending confirmation notification to customer ${booking.user_id}`);
        
        const customerNotification = await sendNotification(
          booking.user_id,
          'Booking Requested',
          `Your booking request for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been sent to the venue owner.`,
          'booking',
          '/bookings',
          {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            status: 'pending',
            booking_date: booking.booking_date,
            venue_name: booking.venue_name
          },
          5
        );
        
        if (!customerNotification) {
          console.error('Failed to send confirmation notification to customer');
        } else {
          console.log('Successfully sent confirmation notification to customer');
        }
      }
    } catch (error) {
      console.error('Failed to notify users about new booking:', error);
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
