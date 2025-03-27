
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
    
    // Fix: Use select() without any filtering to get an array result
    // instead of .single() which expects exactly one row or .maybeSingle() which can return null
    const { data, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select();
      
    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }
    
    // Handle the case where no data is returned
    if (!data || data.length === 0) {
      console.error('Update returned no data for booking:', bookingId);
      
      // Double-check if the update actually worked despite not returning data
      const { data: verifyData, error: verifyError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();
        
      if (verifyError) {
        console.error('Error verifying update:', verifyError);
        throw new Error('Failed to verify update status');
      }
      
      // If we got here, we found the booking after update
      if (verifyData.status === status) {
        console.log('Update succeeded despite not returning data initially');
        return {
          success: true,
          data: verifyData
        };
      } else {
        throw new Error(`Update verification failed: status is ${verifyData.status} instead of ${status}`);
      }
    }
    
    const updatedBooking = data[0];
    
    // Wait longer to ensure database consistency before verification
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Final verification to ensure the change persisted
    const { data: finalVerification, error: finalVerifyError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
      
    if (finalVerifyError) {
      console.error('Final verification error:', finalVerifyError);
      throw new Error('Final verification failed');
    }
    
    console.log('Final verification state:', finalVerification);
    
    // Ensure the status matches what we intended
    if (finalVerification.status !== status) {
      throw new Error(`Status mismatch after final verification - expected ${status} but found ${finalVerification.status}`);
    }
    
    return {
      success: true,
      data: finalVerification
    };
    
  } catch (error) {
    console.error('Direct database update failed:', error);
    throw error;
  }
};
