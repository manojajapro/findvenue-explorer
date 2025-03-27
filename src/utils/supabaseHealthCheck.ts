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
    console.log(`Direct database update: Setting booking ${bookingId} status to ${status}...`);
    
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching booking:', fetchError);
      throw fetchError;
    }
    
    if (!currentBooking) {
      console.error(`Booking not found: ${bookingId}`);
      throw new Error('Booking not found');
    }
    
    console.log('Current booking state:', currentBooking);
    
    if (currentBooking.status === status) {
      console.log(`Booking ${bookingId} is already in ${status} state`);
      return {
        success: true,
        data: currentBooking
      };
    }
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);
    
    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }
    
    console.log('Waiting for database consistency...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: updatedBooking, error: verifyError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
      
    if (verifyError) {
      console.error('Error verifying booking update:', verifyError);
      throw verifyError;
    }
    
    if (!updatedBooking) {
      console.error('Booking not found after update');
      throw new Error('Booking not found after update');
    }
    
    console.log('Verified booking after update:', updatedBooking);
    
    if (updatedBooking.status !== status) {
      console.error(`Status update failed - expected ${status} but found ${updatedBooking.status}`);
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
