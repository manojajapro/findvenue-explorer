import { supabase } from '@/integrations/supabase/client';

export const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection...');
    const startTime = performance.now();
    
    const { data, error } = await supabase.from('bookings').select('id').limit(1);
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    if (error) {
      console.error(`Supabase connection error (${responseTime}ms):`, error);
      return false;
    }
    
    console.log(`Supabase connection successful (${responseTime}ms)`);
    return true;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
};

export const verifyBookingStatus = async (bookingId: string, expectedStatus: string) => {
  try {
    console.log(`Verifying booking ${bookingId} has status ${expectedStatus}...`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const { data, error } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .maybeSingle();
      
    if (error) {
      console.error('Error verifying booking status:', error);
      return false;
    }
    
    if (!data) {
      console.error(`Booking ${bookingId} not found during verification`);
      return false;
    }
    
    const actualStatus = data.status;
    const isMatch = actualStatus === expectedStatus;
    
    console.log(`Booking ${bookingId} status verification: expected=${expectedStatus}, actual=${actualStatus}, match=${isMatch}`);
    
    return isMatch;
  } catch (error) {
    console.error('Booking status verification failed:', error);
    return false;
  }
};

export const updateBookingStatusInDatabase = async (bookingId: string, status: string) => {
  try {
    console.log(`[Update] Starting direct update for booking ${bookingId} to status ${status}`);
    
    // First, verify the booking exists and get venue info
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        venue:venue_id (
          id,
          name,
          owner_info
        )
      `)
      .eq('id', bookingId)
      .maybeSingle();
      
    if (fetchError) {
      console.error('[Update] Error fetching booking:', fetchError);
      throw fetchError;
    }
    
    if (!booking) {
      console.error('[Update] Booking not found:', bookingId);
      throw new Error('Booking not found');
    }

    console.log('[Update] Found booking:', booking);
    
    if (booking.status === status) {
      console.log(`[Update] Booking ${bookingId} is already in ${status} state`);
      return {
        success: true,
        data: booking
      };
    }

    // Get the current user's ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('[Update] Error getting user:', userError);
      throw userError;
    }

    if (!user) {
      console.error('[Update] No authenticated user found');
      throw new Error('No authenticated user found');
    }

    console.log('[Update] Current user:', user.id);

    // Check if user is the venue owner
    const venueOwnerInfo = booking.venue?.owner_info;
    console.log('[Update] Venue owner info:', venueOwnerInfo);

    const isVenueOwner = venueOwnerInfo && 
      typeof venueOwnerInfo === 'object' && 
      'user_id' in venueOwnerInfo && 
      venueOwnerInfo.user_id === user.id;

    console.log('[Update] Is venue owner:', isVenueOwner);

    if (!isVenueOwner) {
      console.error('[Update] User is not venue owner');
      throw new Error('Only venue owners can update booking status');
    }

    // Perform a simple update operation
    console.log('[Update] Performing direct update...');
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
    
    if (updateError) {
      console.error('[Update] Error during update:', updateError);
      throw updateError;
    }

    // Fetch the updated booking to verify
    console.log('[Update] Fetching updated booking...');
    const { data: updatedBooking, error: fetchUpdateError } = await supabase
      .from('bookings')
      .select(`
        *,
        venue:venue_id (
          id,
          name,
          owner_info
        )
      `)
      .eq('id', bookingId)
      .maybeSingle();
    
    if (fetchUpdateError) {
      console.error('[Update] Error fetching updated booking:', fetchUpdateError);
      throw fetchUpdateError;
    }
    
    if (!updatedBooking) {
      console.error('[Update] Updated booking not found');
      throw new Error('Updated booking not found');
    }
    
    console.log('[Update] Updated booking:', updatedBooking);
    
    if (updatedBooking.status !== status) {
      console.error(`[Update] Status mismatch after update - expected ${status} but found ${updatedBooking.status}`);
      throw new Error('Failed to update booking status');
    }

    console.log('[Update] Successfully updated booking status');

    // Send notification to the customer
    try {
      console.log('[Update] Sending notification...');
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          title: `Booking ${status}`,
          message: `Your booking for ${booking.venue?.name || 'the venue'} has been ${status}.`,
          type: 'booking',
          read: false,
          data: {
            booking_id: bookingId,
            venue_id: booking.venue_id,
            status: status
          }
        });

      if (notifyError) {
        console.error('[Update] Error sending notification:', notifyError);
      } else {
        console.log('[Update] Notification sent successfully');
      }
    } catch (notifyError) {
      console.error('[Update] Failed to send notification:', notifyError);
      // Continue even if notification fails
    }

    return {
      success: true,
      data: updatedBooking
    };
    
  } catch (error) {
    console.error('[Update] Update failed:', error);
    throw error;
  }
};
