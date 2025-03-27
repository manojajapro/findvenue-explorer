
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

// Fixed update function with proper error handling and without using updated_at
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
    
    // Update the booking with status only
    console.log(`Updating booking status to ${status}...`);
    const { data: updateResult, error: updateError } = await supabase
      .from('bookings')
      .update({ status: status })
      .eq('id', bookingId)
      .select()
      .maybeSingle();
    
    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }
    
    if (!updateResult) {
      console.error('Update returned no data, will verify manually');
    } else {
      console.log('Update returned data:', updateResult);
    }
      
    // Extended wait to ensure database consistency before verification
    console.log('Waiting for database consistency...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Separate query to fetch the updated booking and verify the change
    console.log('Verifying update with separate query...');
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
      console.error('Could not find booking after update');
      throw new Error('Could not find booking after update');
    }
    
    console.log('Retrieved updated booking:', updatedBooking);
    
    // Final verification - check if status was actually updated
    if (updatedBooking.status !== status) {
      console.error(`Status mismatch - expected ${status} but found ${updatedBooking.status}`);
      
      // One last attempt to force the update - without using updated_at
      console.log('Making final attempt to update status...');
      const { error: finalUpdateError } = await supabase
        .from('bookings')
        .update({ status: status })
        .eq('id', bookingId);
        
      if (finalUpdateError) {
        console.error('Final update attempt failed:', finalUpdateError);
        throw new Error(`Failed to update status to ${status}`);
      }
      
      // Wait once more and verify
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .maybeSingle();
        
      if (finalCheckError || !finalCheck || finalCheck.status !== status) {
        console.error('Final check failed:', finalCheck, finalCheckError);
        throw new Error(`Failed to update status to ${status}`);
      }
      
      console.log('Final update successful:', finalCheck);
      return {
        success: true,
        data: finalCheck
      };
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
