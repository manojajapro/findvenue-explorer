
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

// Fixed function to directly update booking status and handle PostgREST errors
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
    
    // Fix: Use .update().eq() without using single() or maybeSingle()
    // Important: Don't use .single() after update as it will throw PGRST116 if no rows returned
    await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);
      
    // Wait to ensure database consistency before verification (increased time)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Separate query to fetch the updated booking
    const { data: updatedBooking, error: getError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();
      
    if (getError) {
      console.error('Error retrieving updated booking:', getError);
      throw getError;
    }
    
    if (!updatedBooking) {
      throw new Error('Could not find booking after update');
    }
    
    console.log('Retrieved updated booking:', updatedBooking);
    
    // Final verification - check if status was actually updated
    if (updatedBooking.status !== status) {
      console.error(`Status mismatch - expected ${status} but found ${updatedBooking.status}`);
      throw new Error(`Failed to update status to ${status}`);
    }
    
    return {
      success: true,
      data: updatedBooking
    };
    
  } catch (error) {
    console.error('Direct database update failed:', error);
    throw error;
  }
};
