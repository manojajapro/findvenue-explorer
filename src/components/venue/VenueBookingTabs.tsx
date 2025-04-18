
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Calendar as CalendarIcon, LogIn, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import BookingCalendar from './BookingCalendar';

interface VenueBookingTabsProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  minCapacity?: number;
  maxCapacity?: number;
  ownerId: string;
  ownerName: string;
}

export default function VenueBookingTabs({
  venueId,
  venueName,
  pricePerHour = 0,
  minCapacity = 1,
  maxCapacity = 100,
  ownerId,
  ownerName
}: VenueBookingTabsProps) {
  const [activeTab, setActiveTab] = useState('booking');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isOwner = user?.id === ownerId;
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<Record<string, string[]>>({});
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [hourlyBookedDates, setHourlyBookedDates] = useState<string[]>([]);
  const [dayBookedDates, setDayBookedDates] = useState<string[]>([]);
  const [venueStatus, setVenueStatus] = useState<string>('active');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [processingBooking, setProcessingBooking] = useState<boolean>(false);
  
  // New fields for unified booking form
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [peopleCount, setPeopleCount] = useState<string>(minCapacity.toString());
  const [fromTime, setFromTime] = useState<string>('09:00');
  const [toTime, setToTime] = useState<string>('17:00');
  const [bookingType, setBookingType] = useState<'hourly' | 'full-day'>('full-day');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Fetch venue status
  useEffect(() => {
    if (venueId) {
      const fetchVenueStatus = async () => {
        const { data, error } = await supabase
          .from('venues')
          .select('status')
          .eq('id', venueId)
          .single();
          
        if (data && !error) {
          setVenueStatus(data.status || 'active');
        }
      };
      
      fetchVenueStatus();
    }
  }, [venueId]);

  // Fetch existing bookings for this venue to disable already booked dates/times
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoadingBookings(true);
        const { data, error } = await supabase
          .from('bookings')
          .select('booking_date, start_time, end_time, status')
          .eq('venue_id', venueId)
          .in('status', ['confirmed', 'pending']);
          
        if (error) {
          console.error('Error fetching bookings:', error);
          return;
        }

        // Process confirmed bookings to track booked dates and time slots
        const dates: string[] = [];
        const timeSlots: Record<string, string[]> = {};
        const fullyBooked: string[] = [];
        const hourlyBooked: string[] = [];
        const dayBooked: string[] = [];
        
        // Group bookings by date
        const bookingsByDate: Record<string, any[]> = {};
        
        data.forEach(booking => {
          const dateStr = booking.booking_date;
          if (!bookingsByDate[dateStr]) {
            bookingsByDate[dateStr] = [];
          }
          bookingsByDate[dateStr].push(booking);
        });
        
        // Process bookings by date
        Object.entries(bookingsByDate).forEach(([dateStr, bookings]) => {
          // Track day bookings (full day)
          const fullDayBookings = bookings.filter(b => 
            b.start_time === '00:00' && b.end_time === '23:59'
          );
          
          if (fullDayBookings.length > 0) {
            dates.push(dateStr);
            fullyBooked.push(dateStr);
            dayBooked.push(dateStr);
            
            // Add all time slots as booked for this date to prevent hourly bookings
            if (!timeSlots[dateStr]) {
              timeSlots[dateStr] = [];
            }
            timeSlots[dateStr].push('00:00 - 23:59');
          } else {
            // Track hourly bookings
            if (!timeSlots[dateStr]) {
              timeSlots[dateStr] = [];
            }
            
            let totalBookedHours = 0;
            let bookedSlots = new Set<number>();
            
            bookings.forEach(booking => {
              const timeSlot = `${booking.start_time} - ${booking.end_time}`;
              if (!timeSlots[dateStr].includes(timeSlot)) {
                timeSlots[dateStr].push(timeSlot);
              }
              
              // Track booked hours for 24-hour format
              const startHour = parseInt(booking.start_time.split(':')[0]);
              const endHour = parseInt(booking.end_time.split(':')[0]);
              totalBookedHours += (endHour - startHour);
              
              // Mark all hours in this range as booked
              for (let hour = startHour; hour < endHour; hour++) {
                bookedSlots.add(hour);
              }
            });
            
            // If there are any hourly bookings, mark the date
            if (bookings.length > 0) {
              hourlyBooked.push(dateStr);
            }
            
            // If more than 12 hours are booked (considering 24-hour day),
            // consider the day unavailable for full-day booking
            if (bookedSlots.size >= 12 || totalBookedHours >= 12) {
              fullyBooked.push(dateStr);
            }
          }
        });
        
        setBookedDates(dates);
        setBookedTimeSlots(timeSlots);
        setFullyBookedDates(fullyBooked);
        setHourlyBookedDates(hourlyBooked);
        setDayBookedDates(dayBooked);
      } catch (err) {
        console.error('Error processing bookings data:', err);
      } finally {
        setIsLoadingBookings(false);
      }
    };
    
    if (venueId) {
      fetchBookings();
    }
  }, [venueId]);

  // Update available time slots whenever the selected date changes
  useEffect(() => {
    if (selectedDate) {
      // Generate all time slots
      const allTimeSlots = generateTimeSlots();
      
      // Filter out booked time slots for the selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const bookedSlots = bookedTimeSlots[dateStr] || [];
      
      // Get booked hours for this date
      const bookedHours = new Set<number>();
      bookedSlots.forEach(slot => {
        const [start, end] = slot.split(' - ');
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        for (let hour = startHour; hour < endHour; hour++) {
          bookedHours.add(hour);
        }
      });
      
      // Filter available time slots
      const available = allTimeSlots.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return !bookedHours.has(hour);
      });
      
      setAvailableTimeSlots(available);
      
      // Reset time selections if there are no available times or if current selections are no longer valid
      if (available.length === 0) {
        // No times available
        setFromTime('');
        setToTime('');
      } else {
        // Set default from time to first available slot
        if (!available.includes(fromTime)) {
          setFromTime(available[0]);
        }
        
        // Set default to time if current one is invalid
        const validToTimes = available.filter(time => {
          const fromHour = fromTime ? parseInt(fromTime.split(':')[0]) : 0;
          const timeHour = parseInt(time.split(':')[0]);
          return timeHour > fromHour;
        });
        
        if (!validToTimes.includes(toTime)) {
          setToTime(validToTimes.length > 0 ? validToTimes[0] : '');
        }
      }
    }
  }, [selectedDate, bookedTimeSlots, fromTime, toTime]);
  
  // Helper function to generate time slots - Updated for 24 hours
  const generateTimeSlots = (): string[] => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };
  
  const handleBookRequest = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to book this venue",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    if (!selectedDate) {
      toast({
        title: "Date required",
        description: "Please select a booking date",
        variant: "destructive"
      });
      return;
    }
    
    // Format date
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    
    // Validate people count
    const guests = parseInt(peopleCount);
    if (isNaN(guests) || guests < 1 || guests > maxCapacity) {
      toast({
        title: "Invalid guest count",
        description: `Please enter a number between 1 and ${maxCapacity}`,
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessingBooking(true);
      
      let startTime = fromTime;
      let endTime = toTime;
      let totalPrice = 0;
      
      // Calculate price based on booking type
      if (bookingType === 'full-day') {
        startTime = '00:00';
        endTime = '23:59';
        totalPrice = pricePerHour * 10; // Day rate
      } else {
        // Calculate hourly price
        const startHour = parseInt(fromTime.split(':')[0]);
        const endHour = parseInt(toTime.split(':')[0]);
        const hours = endHour - startHour;
        
        if (hours <= 0) {
          toast({
            title: "Invalid time range",
            description: "End time must be after start time",
            variant: "destructive"
          });
          setProcessingBooking(false);
          return;
        }
        
        totalPrice = hours * pricePerHour;
      }
      
      // Check if the slot is already booked
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timeSlot = `${startTime} - ${endTime}`;
      
      if (bookedTimeSlots[dateStr]?.includes(timeSlot)) {
        toast({
          title: "Time slot not available",
          description: "This time slot is already booked. Please select another time.",
          variant: "destructive"
        });
        setProcessingBooking(false);
        return;
      }
      
      // Create booking
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            venue_id: venueId,
            venue_name: venueName,
            booking_date: formattedDate,
            start_time: startTime,
            end_time: endTime,
            status: 'pending',
            total_price: totalPrice,
            guests: guests,
            customer_email: user.email,
          }
        ])
        .select();
        
      if (error) {
        console.error('Booking error:', error);
        toast({
          title: "Booking failed",
          description: error.message,
          variant: "destructive"
        });
        setProcessingBooking(false);
        return;
      }
      
      // Send notification to venue owner
      try {
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: ownerId,
              title: 'New Booking Request',
              message: `New booking request for ${venueName} on ${format(selectedDate, 'MMM dd, yyyy')}`,
              type: 'booking',
              link: '/customer-bookings',
              data: {
                booking_id: data?.[0]?.id,
                venue_id: venueId,
                status: 'pending',
                booking_date: formattedDate,
                venue_name: venueName,
                booking_type: bookingType === 'full-day' ? 'day' : 'hourly'
              }
            }
          ]);
          
        if (notificationError) {
          console.warn('Failed to send notification to owner:', notificationError);
        }
      } catch (notifyError) {
        console.warn('Error in notification process:', notifyError);
      }
      
      // Send notification to customer
      try {
        const { error: customerNotificationError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: user.id,
              title: 'Booking Requested',
              message: `You've requested to book ${venueName} on ${format(selectedDate, 'MMM dd, yyyy')}${
                bookingType === 'hourly' ? ` from ${fromTime} to ${toTime}` : ' for the entire day'
              }. Total: ${totalPrice} ${pricePerHour > 0 ? 'SAR' : ''}`,
              type: 'booking',
              link: '/bookings',
              data: {
                booking_id: data?.[0]?.id,
                venue_id: venueId,
                status: 'pending',
                booking_date: formattedDate,
                venue_name: venueName,
                booking_type: bookingType === 'full-day' ? 'day' : 'hourly'
              }
            }
          ]);
          
        if (customerNotificationError) {
          console.warn('Failed to send notification to customer:', customerNotificationError);
        }
      } catch (notifyError) {
        console.warn('Error in customer notification process:', notifyError);
      }
      
      toast({
        title: "Booking requested!",
        description: `You've successfully requested ${venueName} on ${format(selectedDate, 'PPP')}${
          bookingType === 'hourly' ? ` from ${fromTime} to ${toTime}` : ' for the entire day'
        }. Total: ${totalPrice} ${pricePerHour > 0 ? 'SAR' : ''}`,
      });
      
      // Redirect to bookings page
      navigate('/bookings');
    } catch (err) {
      console.error('Error during booking process:', err);
      toast({
        title: "Booking failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingBooking(false);
    }
  };
  
  // Don't show booking tabs for the venue owner
  if (isOwner) {
    return (
      <div className="glass-card p-4 rounded-lg shadow-lg border border-white/10 bg-findvenue-card-bg/50 backdrop-blur-sm">
        <p className="text-center text-findvenue-text-muted">
          This is your venue. You cannot book your own venue.
        </p>
      </div>
    );
  }

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="glass-card p-5 rounded-lg border border-white/10 bg-findvenue-card-bg/50 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4">Book this venue</h3>
        <div className="text-center py-8">
          <p className="text-findvenue-text-muted mb-4">
            Sign in to book this venue and get access to exclusive offers.
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            className="bg-findvenue hover:bg-findvenue-dark"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Login to Book
          </Button>
        </div>
      </div>
    );
  }

  // Allow bookings for venues with status pending, confirmed, or active
  const bookableStatuses = ['pending', 'confirmed', 'active'];
  if (!bookableStatuses.includes(venueStatus)) {
    return (
      <div className="glass-card p-5 rounded-lg border border-white/10 bg-findvenue-card-bg/50 backdrop-blur-sm">
        <p className="text-center text-findvenue-text-muted">
          This venue is not available for booking at the moment.
        </p>
      </div>
    );
  }

  // Parse pricePerHour to ensure it's a number
  const parsedPricePerHour = Number(pricePerHour) || 0;
  const parsedMinCapacity = Number(minCapacity) || 1;
  const parsedMaxCapacity = Number(maxCapacity) || 100;
  
  // Format day price
  const dayPrice = parsedPricePerHour * 10;

  // Check if there are no available time slots for the current date
  const currentDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isCurrentDateFullyBooked = bookingType === 'full-day' 
    ? fullyBookedDates.includes(currentDateStr) || dayBookedDates.includes(currentDateStr)
    : dayBookedDates.includes(currentDateStr) || availableTimeSlots.length === 0;

  return (
    <div className="glass-card p-5 rounded-lg border border-white/10 bg-findvenue-card-bg/50 backdrop-blur-sm">
      <h3 className="text-xl font-semibold mb-4">Book this venue</h3>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <div>
            <div className="font-bold text-xl">
              {!showDetails ? (
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-500">From </span>
                    <span className="text-2xl">${parsedPricePerHour}</span>
                    <span className="text-gray-500"> / hour</span>
                  </div>
                  <div>
                    <span className="text-2xl">${dayPrice}</span>
                    <span className="text-gray-500"> / day</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-2xl">${bookingType === 'hourly' ? parsedPricePerHour : dayPrice}</span> / {bookingType === 'hourly' ? 'hour' : 'day'}
                </>
              )}
            </div>
            <div className="text-sm text-findvenue-text-muted mt-1">
              {bookingType === 'hourly' ? 'Minimum 2 hours' : 'Full day booking (24 hours)'}
            </div>
          </div>
        </div>
        
        {!showDetails ? (
          <Button 
            onClick={() => setShowDetails(true)}
            className="w-full bg-red-500 hover:bg-red-600 text-white h-12 text-lg mt-4 shadow-md"
          >
            Request to book
          </Button>
        ) : (
          <div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Booking type</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    type="button"
                    variant={bookingType === 'hourly' ? 'default' : 'outline'}
                    className={bookingType === 'hourly' ? 'bg-findvenue text-white shadow-md' : ''}
                    onClick={() => setBookingType('hourly')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Hourly
                  </Button>
                  <Button 
                    type="button"
                    variant={bookingType === 'full-day' ? 'default' : 'outline'}
                    className={bookingType === 'full-day' ? 'bg-findvenue text-white shadow-md' : ''}
                    onClick={() => setBookingType('full-day')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Full day
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Select date</label>
                <BookingCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  bookedDates={bookedDates}
                  fullyBookedDates={fullyBookedDates}
                  dayBookedDates={dayBookedDates}
                  hourlyBookedDates={hourlyBookedDates}
                  bookingType={bookingType}
                />
                
                {isCurrentDateFullyBooked && selectedDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {bookingType === 'full-day' 
                      ? 'This date is not available for full day booking' 
                      : 'No available time slots on this date'}
                  </p>
                )}
              </div>
              
              {bookingType === 'hourly' && selectedDate && availableTimeSlots.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start time</label>
                    <Select value={fromTime} onValueChange={setFromTime}>
                      <SelectTrigger className="w-full">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">End time</label>
                    <Select value={toTime} onValueChange={setToTime}>
                      <SelectTrigger className="w-full">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots
                          .filter(time => {
                            // Only show end times that are after the start time
                            const startHour = parseInt(fromTime.split(':')[0]);
                            const timeHour = parseInt(time.split(':')[0]);
                            return timeHour > startHour;
                          })
                          .map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">People (max {maxCapacity})</label>
                <div className="flex items-center border rounded-md px-3 py-2">
                  <Users className="h-5 w-5 mr-2 text-gray-400" />
                  <Input 
                    type="number" 
                    placeholder={`Number of guests (max ${maxCapacity})`}
                    value={peopleCount} 
                    min={1}
                    max={maxCapacity}
                    onChange={e => setPeopleCount(e.target.value)}
                    className="border-0 p-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleBookRequest}
                className="w-full bg-red-500 hover:bg-red-600 text-white h-12 text-lg mt-4 shadow-md"
                disabled={isLoadingBookings || processingBooking || isCurrentDateFullyBooked}
              >
                {isLoadingBookings || processingBooking ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {processingBooking ? "Processing..." : "Loading..."}
                  </span>
                ) : isCurrentDateFullyBooked ? (
                  'Not Available'
                ) : (
                  'Request to book'
                )}
              </Button>
              
              <p className="text-center text-sm text-gray-500 mt-2">
                You won't be charged yet
              </p>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowDetails(false)}
                disabled={processingBooking}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center pt-4 border-t border-gray-200">
        <div className="flex-shrink-0 mr-4">
          <div className="bg-green-500 rounded-full w-16 h-16 flex items-center justify-center">
            {ownerName ? ownerName.charAt(0) : 'H'}
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white">{ownerName}</h4>
          <p className="text-sm text-white-500">Event Manager from {venueName}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-white-500">
            <div>Response rate - 96%</div>
            <div>Response time - 1h</div>
          </div>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        className="w-full mt-4"
      >
        Message host
      </Button>
    </div>
  );
}
