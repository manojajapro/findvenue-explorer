
import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseConnection, updateBookingStatusInDatabase } from '@/utils/supabaseHealthCheck';
import { 
  sendNotification, 
  getVenueOwnerId, 
  sendBookingStatusNotification,
  notifyVenueOwnerAboutBooking
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
      
      console.log(`Updating booking ${bookingId} status to ${status}, venue ID: ${booking.venue_id}`);
      
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
      
      // Determine booking type for the notification data
      const bookingType = booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly';
      
      // Format booking date
      const formattedDate = booking.booking_date 
        ? format(new Date(booking.booking_date), 'yyyy-MM-dd') 
        : 'scheduled date';
      
      // Ensure the booking data includes all necessary fields for notifications
      const completeBookingData = {
        ...booking,
        ...result.data,
        status: status,
        booking_date: formattedDate,
        booking_type: bookingType
      };
      
      // Send notifications to both venue owner and customer
      console.log('Sending notifications for status update:', status);
      
      // Get venue owner ID directly since this function may be called from various places
      const ownerId = await getVenueOwnerId(booking.venue_id);
      if (ownerId) {
        console.log('Found venue owner ID to notify about status update:', ownerId);
      } else {
        console.warn('Could not find venue owner ID for venue:', booking.venue_id);
      }
      
      // Use the sendBookingStatusNotification function to handle notifications
      const notificationSent = await sendBookingStatusNotification(completeBookingData, status);
      
      if (!notificationSent) {
        console.warn('Notifications might not have been sent successfully. Attempting direct notification...');
        
        // Try a direct notification to venue owner if we have their ID
        if (ownerId) {
          const notificationData = {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            status: status,
            booking_date: formattedDate,
            venue_name: booking.venue_name,
            booking_type: bookingType
          };
          
          const ownerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
          const ownerMessage = status === 'confirmed' 
            ? `A booking for "${booking.venue_name}" on ${formattedDate} has been confirmed.`
            : `You have cancelled a booking for "${booking.venue_name}" on ${formattedDate}.`;
          
          await sendNotification(
            ownerId,
            ownerTitle,
            ownerMessage,
            'booking',
            '/customer-bookings',
            notificationData,
            5
          );
        }
        
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
    if (!booking) return false;
    
    try {
      console.log('Sending notification to venue owner for booking:', booking.id, 'Venue ID:', booking.venue_id);
      
      // Use the more robust notification service function that handles permissions properly
      const result = await notifyVenueOwnerAboutBooking(booking);
      
      if (!result) {
        console.error('Failed to notify venue owner about new booking. Attempting direct notification...');
        
        // Try a direct notification
        const ownerId = await getVenueOwnerId(booking.venue_id);
        if (ownerId) {
          const formattedDate = booking.booking_date 
            ? format(new Date(booking.booking_date), 'yyyy-MM-dd') 
            : 'scheduled date';
            
          const bookingType = booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly';
          
          const notificationData = {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            status: booking.status,
            booking_date: formattedDate,
            venue_name: booking.venue_name,
            booking_type: bookingType
          };
          
          await sendNotification(
            ownerId,
            'New Booking Request',
            `A new booking request for "${booking.venue_name}" on ${formattedDate} has been received.`,
            'booking',
            '/customer-bookings',
            notificationData,
            5
          );
          
          return true;
        }
        
        return false;
      }
      
      console.log('Successfully sent notification to venue owner');
      
      return true;
    } catch (error) {
      console.error('Failed to notify venue owner about new booking:', error);
      return false;
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
