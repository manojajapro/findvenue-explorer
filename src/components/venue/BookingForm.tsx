import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, Users, Loader2, AlertTriangle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BookingFormProps = {
  venueId: string;
  venueName: string;
  pricePerHour: number;
  ownerId: string;
  ownerName: string;
};

const BookingForm = ({ venueId, venueName, pricePerHour, ownerId, ownerName }: BookingFormProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (venueId) {
      fetchExistingBookings();
    }

    if (user && venueId) {
      fetchUserBookings();
    }
  }, [venueId, user]);
  
  const fetchExistingBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time')
        .eq('venue_id', venueId)
        .eq('status', 'confirmed');
        
      if (error) throw error;
      
      if (data) {
        setExistingBookings(data);
      }
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
    }
  };

  const fetchUserBookings = async () => {
    if (!user) return;
    
    try {
      console.log(`Fetching user bookings for venue ${venueId} and user ${user.id}`);
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId)
        .eq('user_id', user.id)
        .or('status.eq.pending,status.eq.confirmed');
        
      if (error) {
        console.error('Error fetching user bookings:', error);
        throw error;
      }
      
      console.log('User bookings fetched:', data);
      
      if (data) {
        setUserBookings(data);
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
    }
  };
  
  const calculateTotalPrice = (): number => {
    if (!startTime || !endTime || !guestCount) return 0;
    
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    if (!start || !end) return 0;
    
    let hours = end.getHours() - start.getHours();
    const minutesDiff = end.getMinutes() - start.getMinutes();
    hours += minutesDiff / 60;
    
    if (hours <= 0) return 0;
    
    const basePrice = Math.round(hours * pricePerHour);
    
    const guests = parseInt(guestCount);
    if (guests <= 1) {
      return basePrice;
    } else if (guests <= 5) {
      return basePrice * 1.1;
    } else if (guests <= 10) {
      return basePrice * 1.2;
    } else if (guests <= 20) {
      return basePrice * 1.3;
    } else {
      return basePrice * 1.5;
    }
  };
  
  const parseTime = (timeString: string): Date | null => {
    if (!timeString) return null;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  
  const formatDateTime = (dateObj: Date, timeString: string): string => {
    if (!dateObj || !timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const datetime = new Date(dateObj);
    datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return datetime.toISOString();
  };
  
  const isDateBooked = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return existingBookings.some(booking => booking.booking_date === dateStr);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast({
        title: 'Login Required',
        description: 'Please log in to book this venue',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    
    if (!date || !startTime || !endTime || !guestCount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const totalPrice = calculateTotalPrice();
    
    if (totalPrice <= 0) {
      toast({
        title: 'Invalid Time Selection',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }
    
    const selectedDateStr = date.toISOString().split('T')[0];
    const timeConflict = existingBookings.some(booking => {
      if (booking.booking_date !== selectedDateStr) return false;
      
      const bookingStart = parseTime(booking.start_time);
      const bookingEnd = parseTime(booking.end_time);
      const newStart = parseTime(startTime);
      const newEnd = parseTime(endTime);
      
      if (!bookingStart || !bookingEnd || !newStart || !newEnd) return false;
      
      return (newStart < bookingEnd && newEnd > bookingStart);
    });
    
    if (timeConflict) {
      toast({
        title: 'Time Slot Unavailable',
        description: 'This time slot is already booked. Please select a different time.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          venue_id: venueId,
          venue_name: venueName,
          booking_date: date.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          guests: parseInt(guestCount),
          special_requests: specialRequests,
          total_price: totalPrice,
          status: 'pending'
        })
        .select();
      
      if (bookingError) throw bookingError;
      
      await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          title: 'New Booking Request',
          message: `${profile.first_name} ${profile.last_name} has requested to book "${venueName}" on ${format(date, 'PPP')}`,
          type: 'booking',
          read: false,
          link: '/customer-bookings',
          data: {
            booking_id: bookingData?.[0]?.id,
            venue_id: venueId
          }
        });
      
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Booking Requested',
          message: `Your booking request for "${venueName}" has been submitted and is pending approval`,
          type: 'booking',
          read: false,
          link: '/bookings',
          data: {
            booking_id: bookingData?.[0]?.id,
            venue_id: venueId
          }
        });
      
      toast({
        title: 'Booking Submitted',
        description: 'Your booking request has been submitted successfully',
      });
      
      setDate(undefined);
      setStartTime('');
      setEndTime('');
      setGuestCount('');
      setSpecialRequests('');
      
      fetchUserBookings();
      
      toast({
        title: 'View Bookings',
        description: 'Go to your bookings to view the status of your request',
        action: (
          <Button onClick={() => navigate('/bookings')} variant="outline" size="sm">
            View Bookings
          </Button>
        ),
      });
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    setIsCancelling(true);
    try {
      console.log(`Cancelling booking ${bookingId}`);
      
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) {
        console.error('Error cancelling booking:', error);
        throw error;
      }
      
      console.log(`Booking ${bookingId} cancelled successfully`);
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();
        
      if (verifyError) {
        console.error('Error verifying booking cancellation:', verifyError);
      } else {
        console.log(`Booking ${bookingId} status verified as: ${verifyData.status}`);
      }
      
      await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          title: 'Booking Cancelled',
          message: `A booking for "${venueName}" has been cancelled by the customer`,
          type: 'booking',
          read: false,
          link: '/customer-bookings'
        });

      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been cancelled successfully',
      });
      
      await fetchUserBookings();
      
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const initiateChat = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to chat with the venue owner',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    
    if (!ownerId) {
      toast({
        title: 'Error',
        description: 'Could not identify the venue owner. Please try again later.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log("Initiating chat with owner:", ownerId);
      setIsLoading(true);
      
      const { data: existingMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${ownerId}),and(sender_id.eq.${ownerId},receiver_id.eq.${user.id})`)
        .limit(1);
        
      if (messagesError) {
        console.error("Error checking existing messages:", messagesError);
        throw messagesError;
      }
      
      if (!existingMessages || existingMessages.length === 0) {
        console.log("No existing conversation found, creating initial message");
        
        let senderName = '';
        if (profile) {
          senderName = `${profile.first_name} ${profile.last_name}`;
        } else {
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
            
          if (!userError && userData) {
            senderName = `${userData.first_name} ${userData.last_name}`;
          } else {
            senderName = 'User';
            console.warn("Could not get user profile data:", userError);
          }
        }
        
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: ownerId,
            content: `Hello! I'm interested in booking ${venueName}. Can you provide more information?`,
            sender_name: senderName,
            receiver_name: ownerName || 'Venue Owner',
            venue_id: venueId,
            venue_name: venueName,
            read: false
          })
          .select()
          .single();
          
        if (messageError) {
          console.error("Error sending initial message:", messageError);
          throw messageError;
        }
        
        console.log("Initial message created:", messageData);
        
        await supabase
          .from('notifications')
          .insert({
            user_id: ownerId,
            title: 'New Message',
            message: `${senderName} started a conversation with you about ${venueName}`,
            type: 'message',
            read: false,
            link: `/messages/${user.id}`,
            data: {
              sender_id: user.id,
              venue_id: venueId
            }
          });
      } else {
        console.log("Existing conversation found");
      }
      
      navigate(`/messages/${ownerId}`);
      
    } catch (error: any) {
      console.error("Error initiating chat:", error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-findvenue-text-muted mb-4">
              Please log in to book this venue
            </p>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-findvenue hover:bg-findvenue-dark"
            >
              Login to Book
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userBookings.length > 0) {
    return (
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Your Booking for This Venue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userBookings.map(booking => (
            <div key={booking.id} className="border border-white/10 rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{format(new Date(booking.booking_date), 'MMMM d, yyyy')}</h3>
                  <p className="text-findvenue-text-muted">{booking.start_time} - {booking.end_time}</p>
                  <p className="text-findvenue-text-muted">{booking.guests} guests</p>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-findvenue-text-muted text-sm">Total Price</p>
                  <p className="font-bold">SAR {booking.total_price}</p>
                </div>
              </div>

              {booking.special_requests && (
                <div className="mt-3 bg-findvenue-surface/30 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Special Requests:</p>
                  <p className="text-sm text-findvenue-text-muted">{booking.special_requests}</p>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={initiateChat}
                  className="text-findvenue border-findvenue hover:bg-findvenue/10"
                >
                  Chat with Owner
                </Button>

                {booking.status !== 'cancelled' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 mr-2" />
                        )}
                        Cancel Booking
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-findvenue-card-bg border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this booking? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive hover:bg-destructive/90 text-white"
                          onClick={() => cancelBooking(booking.id)}
                        >
                          Yes, Cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}

          <Button 
            onClick={() => navigate('/bookings')} 
            className="w-full mt-4 bg-findvenue hover:bg-findvenue-dark"
          >
            View All Bookings
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <CardTitle className="text-xl">Book This Venue</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-findvenue-text-muted"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || isDateBooked(date);
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
                <Input
                  id="startTime"
                  type="time"
                  className="pl-10"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
                <Input
                  id="endTime"
                  type="time"
                  className="pl-10"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="guests">Number of Guests <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                id="guests"
                type="number"
                placeholder="Enter number of guests"
                className="pl-10"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                min="1"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              placeholder="Any special requirements or setup instructions?"
              className="min-h-[100px]"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </div>
          
          <div className="bg-findvenue/10 p-4 rounded-md">
            <p className="text-sm mb-2">Booking Summary</p>
            <div className="flex justify-between items-center">
              <span className="text-findvenue-text-muted">Total Amount:</span>
              <span className="text-xl font-bold">
                SAR {calculateTotalPrice().toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={initiateChat}
              className="text-findvenue border-findvenue hover:bg-findvenue/10"
            >
              Chat with Owner
            </Button>

            <Button 
              type="submit" 
              className="bg-findvenue hover:bg-findvenue-dark"
              disabled={isSubmitting || !date || !startTime || !endTime || !guestCount}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Request Booking'
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
};

export default BookingForm;
