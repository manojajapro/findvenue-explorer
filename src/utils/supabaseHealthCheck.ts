
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
      .single();
      
    if (error) {
      console.error('Error verifying booking status:', error);
      return false;
    }
    
    const actualStatus = data?.status;
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
    
    // Execute the update
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select();
      
    if (error) {
      console.error('Error in direct database update:', error);
      throw error;
    }
    
    console.log(`Direct database update completed:`, data);
    
    // Wait to ensure consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the update
    const { data: verifiedData, error: verifyError } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
      
    if (verifyError) {
      console.error('Error verifying direct database update:', verifyError);
      throw verifyError;
    }
    
    const updateSuccessful = verifiedData?.status === status;
    
    console.log(`Direct database update verification: success=${updateSuccessful}, status=${verifiedData?.status}`);
    
    return {
      success: updateSuccessful,
      data: verifiedData
    };
  } catch (error) {
    console.error('Direct database update failed:', error);
    throw error;
  }
};
