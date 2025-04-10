
import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseConnection, updateBookingStatusInDatabase } from '@/utils/supabaseHealthCheck';
import { notifyVenueOwnerAboutBooking, sendNotification, getVenueOwnerId } from '@/utils/notificationService';

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
      
      // Get venue owner ID for notification
      console.log("Getting venue owner ID for notification...");
      const ownerId = await getVenueOwnerId(booking.venue_id);
      console.log(`Got venue owner ID for notification: ${ownerId}`);
      
      // Create notification for venue owner
      if (ownerId) {
        console.log(`Creating notification for venue owner ${ownerId} about booking status change`);
        const notificationTitle = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled';
        const notificationMessage = status === 'confirmed' 
          ? `You have confirmed a booking for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')}.`
          : `You have cancelled a booking for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')}.`;
          
        // Direct notification insertion for venue owner with multiple attempts for reliability
        let ownerNotificationSuccess = false;
        let attempts = 0;
        
        while (!ownerNotificationSuccess && attempts < 5) {
          try {
            console.log(`Attempt ${attempts+1} to send owner notification...`);
            const { error: ownerNotificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: ownerId,
                title: notificationTitle,
                message: notificationMessage,
                type: 'booking',
                read: false,
                link: '/customer-bookings',
                data: {
                  booking_id: bookingId,
                  venue_id: booking.venue_id
                }
              });
              
            if (!ownerNotificationError) {
              ownerNotificationSuccess = true;
              console.log('Direct notification successfully sent to venue owner');
            } else {
              attempts++;
              console.error(`Error sending owner notification (attempt ${attempts}):`, ownerNotificationError);
              if (attempts < 5) await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (notifyError) {
            attempts++;
            console.error(`Exception in owner notification (attempt ${attempts}):`, notifyError);
            if (attempts < 5) await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!ownerNotificationSuccess) {
          console.error('Failed to send notification to venue owner after multiple attempts');
          toast({
            variant: "warning",
            title: "Notification Warning",
            description: "We've updated the booking, but notification to venue owner might be delayed.",
          });
        }
      } else {
        console.error('Could not find venue owner ID for notification');
      }
      
      // Send notification to customer
      try {
        console.log(`Sending notification to customer ${booking.user_id} about booking status change`);
        let customerNotificationSuccess = false;
        let customerAttempts = 0;
        
        while (!customerNotificationSuccess && customerAttempts < 5) {
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
              customerAttempts++;
              console.error(`Error sending customer notification (attempt ${customerAttempts}):`, notificationError);
              if (customerAttempts < 5) await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              customerNotificationSuccess = true;
              console.log('Notification sent successfully to customer');
            }
          } catch (notifyError) {
            customerAttempts++;
            console.error(`Exception in customer notification (attempt ${customerAttempts}):`, notifyError);
            if (customerAttempts < 5) await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!customerNotificationSuccess) {
          console.error('Failed to send notification to customer after multiple attempts');
          toast({
            variant: "warning",
            title: "Notification Warning",
            description: "We've updated the booking, but notification to customer might be delayed.",
          });
        }
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
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
      
      // Make multiple attempts to ensure notification is sent
      let attempts = 0;
      let result = null;
      
      while (!result && attempts < 5) {
        try {
          // Get venue owner ID directly
          const ownerId = await getVenueOwnerId(booking.venue_id);
          
          if (!ownerId) {
            console.error('Could not find venue owner ID for venue', booking.venue_id);
            attempts++;
            if (attempts < 5) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
          
          console.log(`Attempting direct notification insertion for owner ${ownerId}`);
          
          // Direct notification insertion for better reliability
          const { error } = await supabase
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
                venue_id: booking.venue_id
              }
            });
            
          if (error) {
            console.error('Error inserting owner notification:', error);
            attempts++;
          } else {
            result = true;
            console.log('Successfully sent direct notification to venue owner');
          }
        } catch (err) {
          console.error(`Exception during notification attempt ${attempts}:`, err);
          attempts++;
        }
        
        if (!result && attempts < 5) {
          console.log(`Attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      if (!result) {
        console.error('Failed to send notification to venue owner after multiple attempts');
        toast({
          variant: "warning",
          title: "Notification Warning",
          description: "Your booking was created, but the venue owner might not be notified immediately.",
        });
      }
      
      // Also send a confirmation notification to the customer
      let customerAttempts = 0;
      let customerResult = null;
      
      while (!customerResult && customerAttempts < 5) {
        try {
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
            customerAttempts++;
          } else {
            customerResult = true;
            console.log('Booking confirmation notification sent to customer');
          }
        } catch (err) {
          console.error(`Exception during customer notification attempt ${customerAttempts}:`, err);
          customerAttempts++;
        }
        
        if (!customerResult && customerAttempts < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000 * customerAttempts));
        }
      }
    } catch (error) {
      console.error('Failed to notify venue owner about new booking:', error);
    }
  };
  
  return { updateBookingStatus, notifyVenueOwner, isBusy };
};
