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
import { CalendarIcon, Clock, Users, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  
  useEffect(() => {
    if (venueId) {
      fetchExistingBookings();
    }
  }, [venueId]);
  
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
  
  const calculateTotalPrice = (): number => {
    if (!startTime || !endTime) return 0;
    
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    if (!start || !end) return 0;
    
    let hours = end.getHours() - start.getHours();
    const minutesDiff = end.getMinutes() - start.getMinutes();
    hours += minutesDiff / 60;
    
    if (hours <= 0) return 0;
    
    return Math.round(hours * pricePerHour);
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
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-findvenue hover:bg-findvenue-dark"
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
        </CardFooter>
      </form>
    </Card>
  );
};

export default BookingForm;
