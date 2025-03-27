
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

// This function can be used to verify if a specific booking exists and has the correct status
export const verifyBookingStatus = async (bookingId: string, expectedStatus: string) => {
  try {
    console.log(`Verifying booking ${bookingId} has status ${expectedStatus}...`);
    
    // Wait a bit longer to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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

// New function to directly update booking status and return confirmation
export const updateBookingStatusInDatabase = async (bookingId: string, status: string) => {
  try {
    console.log(`Direct database update: Setting booking ${bookingId} status to ${status}...`);
    
    // First, verify the booking exists and get its current state
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error fetching booking:', fetchError);
      throw fetchError;
    }
    
    if (!currentBooking) {
      console.error(`Booking not found: ${bookingId}`);
      throw new Error('Booking not found');
    }
    
    console.log('Current booking state:', currentBooking);
    
    // If already in desired state, return success
    if (currentBooking.status === status) {
      console.log(`Booking ${bookingId} is already in ${status} state`);
      return {
        success: true,
        data: currentBooking
      };
    }
    
    // Perform the update without using single()
    const { data: updatedData, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select();
      
    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }
    
    if (!updatedData || updatedData.length === 0) {
      throw new Error('Update returned no data');
    }
    
    const updatedBooking = updatedData[0];
    
    // Add a small delay before verification to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verify the update - use maybeSingle() instead of single()
    const { data: verifiedBooking, error: verifyError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();
      
    if (verifyError) {
      console.error('Error verifying booking update:', verifyError);
      throw verifyError;
    }
    
    if (!verifiedBooking) {
      throw new Error('Could not verify booking update - booking not found');
    }
    
    console.log('Verified booking state:', verifiedBooking);
    
    // Final status check
    if (verifiedBooking.status !== status) {
      console.error(`Status mismatch - expected ${status} but found ${verifiedBooking.status}`);
      throw new Error(`Failed to update status to ${status}`);
    }
    
    return {
      success: true,
      data: verifiedBooking
    };
    
  } catch (error) {
    console.error('Direct database update failed:', error);
    throw error;
  }
};
