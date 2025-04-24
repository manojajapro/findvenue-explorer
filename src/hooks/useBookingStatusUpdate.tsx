
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
    status: 'confirmed' | 'cancelled' | 'pending', 
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
      
      console.log(`[STATUS_UPDATE] Updating booking ${bookingId} status to ${status}, venue ID: ${booking.venue_id}`);
      
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
      
      // Get venue owner ID directly since this function may be called from various places
      console.log('[STATUS_UPDATE] Getting venue owner ID for venue:', booking.venue_id);
      const ownerId = await getVenueOwnerId(booking.venue_id);
      
      if (ownerId) {
        console.log('[STATUS_UPDATE] Found venue owner ID to notify about status update:', ownerId);
      } else {
        console.warn('[STATUS_UPDATE] Could not find venue owner ID for venue:', booking.venue_id);
      }
      
      // Send notifications to both venue owner and customer
      console.log('[STATUS_UPDATE] Sending notifications for status update:', status);
      
      // Use the sendBookingStatusNotification function to handle notifications
      let notificationSent = await sendBookingStatusNotification(completeBookingData, status);
      
      // If primary notification method failed, try a more direct approach
      if (!notificationSent) {
        console.warn('[STATUS_UPDATE] Primary notification method failed. Attempting direct notification...');
        
        // Try a direct notification to venue owner if we have their ID
        if (ownerId) {
          try {
            const notificationData = {
              booking_id: booking.id,
              venue_id: booking.venue_id,
              status: status,
              booking_date: formattedDate,
              venue_name: booking.venue_name,
              booking_type: bookingType
            };
            
            const ownerTitle = status === 'confirmed' ? 'Booking Confirmed' : 
                            status === 'cancelled' ? 'Booking Cancelled' : 'Booking Update';
            const ownerMessage = status === 'confirmed' 
              ? `A booking for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM dd, yyyy')} has been confirmed.`
              : status === 'cancelled'
              ? `You have cancelled a booking for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM dd, yyyy')}.`
              : `A booking status for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM dd, yyyy')} has been updated.`;
            
            console.log('[STATUS_UPDATE] Attempting direct notification to venue owner:', ownerId);
            const ownerNotification = await sendNotification(
              ownerId,
              ownerTitle,
              ownerMessage,
              'booking',
              '/customer-bookings',
              notificationData
            );
            
            if (ownerNotification) {
              console.log('[STATUS_UPDATE] Direct notification to venue owner succeeded');
              notificationSent = true;
            }
          } catch (notifyError) {
            console.error('[STATUS_UPDATE] Error in direct notification attempt:', notifyError);
          }
        }
        
        // Notify customer directly as well
        if (booking.user_id) {
          try {
            const notificationData = {
              booking_id: booking.id,
              venue_id: booking.venue_id,
              status: status,
              booking_date: formattedDate,
              venue_name: booking.venue_name,
              booking_type: bookingType
            };
            
            const customerTitle = status === 'confirmed' ? 'Booking Confirmed' : 
                               status === 'cancelled' ? 'Booking Cancelled' : 'Booking Update';
            const customerMessage = status === 'confirmed' 
              ? `Your booking for ${booking.venue_name} on ${format(new Date(booking.booking_date), 'MMM dd, yyyy')} has been confirmed.`
              : status === 'cancelled'
              ? `Your booking for ${booking.venue_name} on ${format(new Date(booking.booking_date), 'MMM dd, yyyy')} has been cancelled by the venue owner.`
              : `Your booking status for ${booking.venue_name} on ${format(new Date(booking.booking_date), 'MMM dd, yyyy')} has been updated.`;
            
            console.log('[STATUS_UPDATE] Attempting direct notification to customer:', booking.user_id);
            await sendNotification(
              booking.user_id,
              customerTitle,
              customerMessage,
              'booking',
              '/bookings',
              notificationData
            );
          } catch (notifyError) {
            console.error('[STATUS_UPDATE] Error in direct customer notification attempt:', notifyError);
          }
        }
      }
      
      if (!notificationSent) {
        toast({
          variant: "destructive",
          title: "Notification Warning",
          description: "Booking status updated, but notifications might be delayed.",
        });
      }
      
      // Dismiss the processing toast and show success
      processingToast.dismiss();
      toast({
        title: status === 'confirmed' ? 'Booking Confirmed' : status === 'cancelled' ? 'Booking Cancelled' : 'Booking Updated',
        description: `The booking has been ${status} successfully.`,
      });
      
      // Fetch bookings again to ensure data is fresh
      await fetchBookings();
      
    } catch (error: any) {
      console.error(`[STATUS_UPDATE] Error updating booking status:`, error);
      
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
  
  // Function to notify venue owner when a booking is created
  const notifyVenueOwner = async (booking: any) => {
    if (!booking) return false;
    
    try {
      console.log('[OWNER_NOTIFY] Sending notification to venue owner for booking:', booking.id, 'Venue ID:', booking.venue_id);
      
      // Ensure we have booking type information
      const bookingType = booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly';
      const enrichedBooking = {
        ...booking,
        booking_type: bookingType
      };
      
      // Use the more robust notification service function that handles permissions properly
      const result = await notifyVenueOwnerAboutBooking(enrichedBooking);
      
      if (!result) {
        console.error('[OWNER_NOTIFY] Failed to notify venue owner about new booking. Attempting direct notification...');
        
        // Try a direct notification as fallback
        const ownerId = await getVenueOwnerId(booking.venue_id);
        if (ownerId) {
          console.log('[OWNER_NOTIFY] Found venue owner ID for direct notification:', ownerId);
          
          const formattedDate = booking.booking_date 
            ? format(new Date(booking.booking_date), 'MMM dd, yyyy') 
            : 'scheduled date';
          
          const notificationData = {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            status: booking.status || 'pending',
            booking_date: booking.booking_date, // Keep original for consistency
            venue_name: booking.venue_name,
            booking_type: bookingType
          };
          
          await sendNotification(
            ownerId,
            'New Booking Request',
            `A new booking request for "${booking.venue_name}" on ${formattedDate} has been received.`,
            'booking',
            '/customer-bookings',
            notificationData
          );
          
          return true;
        }
        
        return false;
      }
      
      console.log('[OWNER_NOTIFY] Successfully sent notification to venue owner');
      
      return true;
    } catch (error) {
      console.error('[OWNER_NOTIFY] Failed to notify venue owner about new booking:', error);
      return false;
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
