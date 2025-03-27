
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    
    // Execute the update with retry mechanism
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let data = null;
    
    while (attempts < maxAttempts && !success) {
      attempts++;
      console.log(`Attempt ${attempts} to update booking ${bookingId} status...`);
      
      // Execute the update
      const updateResult = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .select();
        
      if (updateResult.error) {
        console.error(`Error in direct database update (attempt ${attempts}):`, updateResult.error);
        if (attempts === maxAttempts) throw updateResult.error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        continue;
      }
      
      data = updateResult.data;
      console.log(`Direct database update completed for attempt ${attempts}:`, data);
      
      // Wait to ensure consistency (increase wait time)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the update
      const verifyResult = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();
        
      if (verifyResult.error) {
        console.error(`Error verifying direct database update (attempt ${attempts}):`, verifyResult.error);
        if (attempts === maxAttempts) throw verifyResult.error;
        continue;
      }
      
      if (verifyResult.data?.status === status) {
        success = true;
        console.log(`Direct database update verified successfully on attempt ${attempts}`);
      } else {
        console.warn(`Database verification failed on attempt ${attempts}. Expected: ${status}, Got: ${verifyResult.data?.status}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }
    
    return {
      success,
      data,
      attempts
    };
  } catch (error) {
    console.error('Direct database update failed:', error);
    return {
      success: false,
      error,
      attempts: 3
    };
  }
};
