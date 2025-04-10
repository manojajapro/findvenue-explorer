
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
      
      try {
        // Directly send notifications instead of using the helper function
        const ownerId = await getVenueOwnerId(completeBookingData.venue_id);
        const formattedDate = completeBookingData.booking_date 
          ? format(new Date(completeBookingData.booking_date), 'MMM d, yyyy') 
          : 'scheduled date';
        
        // Notify owner
        if (ownerId) {
          const ownerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
          const ownerMessage = status === 'confirmed' 
            ? `You have confirmed a booking for "${completeBookingData.venue_name}" on ${formattedDate}.`
            : `You have cancelled a booking for "${completeBookingData.venue_name}" on ${formattedDate}.`;
          
          console.log(`Sending notification to owner ${ownerId} for status ${status}`);
          
          const { data: ownerNotification, error: ownerNotifError } = await supabase
            .from('notifications')
            .insert({
              user_id: ownerId,
              title: ownerTitle,
              message: ownerMessage,
              type: 'booking',
              read: false,
              link: '/customer-bookings',
              data: {
                booking_id: completeBookingData.id,
                venue_id: completeBookingData.venue_id,
                status: status,
                booking_date: completeBookingData.booking_date,
                venue_name: completeBookingData.venue_name
              }
            })
            .select();
          
          if (ownerNotifError) {
            console.error('Error sending notification to owner:', ownerNotifError);
          } else {
            console.log('Successfully sent notification to owner:', ownerNotification);
          }
        }
        
        // Notify customer
        if (completeBookingData.user_id) {
          const customerTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
          const customerMessage = status === 'confirmed' 
            ? `Your booking for ${completeBookingData.venue_name} on ${formattedDate} has been confirmed.`
            : `Your booking for ${completeBookingData.venue_name} on ${formattedDate} has been cancelled by the venue owner.`;
          
          console.log(`Sending notification to customer ${completeBookingData.user_id} for status ${status}`);
          
          const { data: customerNotification, error: customerNotifError } = await supabase
            .from('notifications')
            .insert({
              user_id: completeBookingData.user_id,
              title: customerTitle,
              message: customerMessage,
              type: 'booking',
              read: false,
              link: '/bookings',
              data: {
                booking_id: completeBookingData.id,
                venue_id: completeBookingData.venue_id,
                status: status,
                booking_date: completeBookingData.booking_date,
                venue_name: completeBookingData.venue_name
              }
            })
            .select();
          
          if (customerNotifError) {
            console.error('Error sending notification to customer:', customerNotifError);
          } else {
            console.log('Successfully sent notification to customer:', customerNotification);
          }
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
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
      
      console.log(`Sending notification to owner ${ownerId} for booking type: ${booking.start_time === '00:00' && booking.end_time === '23:59' ? 'full-day' : 'hourly'}`);
      
      // Directly insert notification to database
      const { data: ownerNotification, error: ownerNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          title: 'New Booking Request',
          message: `A new booking request for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been received.`,
          type: 'booking',
          read: false,
          link: '/customer-bookings',
          data: {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            status: 'pending',
            booking_date: booking.booking_date,
            venue_name: booking.venue_name
          }
        })
        .select();
      
      if (ownerNotifError) {
        console.error('Failed to send notification to venue owner:', ownerNotifError);
        toast({
          variant: "destructive",
          title: "Notification Warning",
          description: "Your booking was created, but the venue owner might not be notified immediately.",
        });
      } else {
        console.log('Successfully sent notification to venue owner:', ownerNotification);
      }
      
      // Also send a confirmation notification to the customer
      if (booking.user_id) {
        console.log(`Sending confirmation notification to customer ${booking.user_id}`);
        
        const { data: customerNotification, error: customerNotifError } = await supabase
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
              venue_id: booking.venue_id,
              status: 'pending',
              booking_date: booking.booking_date,
              venue_name: booking.venue_name
            }
          })
          .select();
        
        if (customerNotifError) {
          console.error('Failed to send confirmation notification to customer:', customerNotifError);
        } else {
          console.log('Successfully sent confirmation notification to customer:', customerNotification);
        }
      }
    } catch (error) {
      console.error('Failed to notify users about new booking:', error);
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
