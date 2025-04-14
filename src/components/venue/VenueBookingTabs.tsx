
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingForm from '@/components/venue/BookingForm';
import MultiDayBookingForm from '@/components/venue/MultiDayBookingForm';
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
  const [bookingType, setBookingType] = useState<'hourly' | 'full-day'>('hourly');
  
  // New fields for unified booking form
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [peopleCount, setPeopleCount] = useState<string>(minCapacity.toString());
  const [fromTime, setFromTime] = useState<string>('09:00');
  const [toTime, setToTime] = useState<string>('17:00');

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
  
  // Helper function to generate time slots - Updated for 24 hours
  const generateTimeSlots = (): string[] => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };
  
  const handleBookRequest = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to book this venue",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    // Here you would implement the booking logic
    toast({
      title: "Booking request sent",
      description: "We'll contact you shortly to confirm your booking"
    });
  };

  // Don't show booking tabs for the venue owner
  if (isOwner) {
    return (
      <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
        <p className="text-center text-findvenue-text-muted">
          This is your venue. You cannot book your own venue.
        </p>
      </div>
    );
  }

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
        <h3 className="text-lg font-semibold mb-4">Book this venue</h3>
        <div className="text-center py-8">
          <p className="text-findvenue-text-muted mb-4">
            You need to be logged in to book this venue.
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
      <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
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

  return (
    <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
      <h3 className="text-lg font-semibold mb-4">Book this venue</h3>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <div>
            <div className="font-bold text-xl">
              from <span className="text-2xl">${parsedPricePerHour}</span> / hour
              <span className="ml-6 text-2xl">${parsedPricePerHour * 10}</span> / day
            </div>
            <div className="text-sm text-findvenue-text-muted">Minimum 2 hours</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date and time</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "MM/dd/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {/* Calendar component would go here */}
              </PopoverContent>
            </Popover>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select value={fromTime} onValueChange={setFromTime}>
                <SelectTrigger className="w-full">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeSlots().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={toTime} onValueChange={setToTime}>
                <SelectTrigger className="w-full">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeSlots().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
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
        </div>
        
        <Button 
          onClick={handleBookRequest}
          className="w-full bg-red-400 hover:bg-red-500 text-white h-12 text-lg mt-4"
        >
          Request to book
        </Button>
        
        <p className="text-center text-sm text-gray-500 mt-2">
          You won't be charged yet
        </p>
      </div>
      
      <div className="flex items-center pt-4 border-t border-gray-200">
        <div className="flex-shrink-0 mr-4">
          <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center">
            {ownerName ? ownerName.charAt(0) : 'H'}
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{ownerName}</h4>
          <p className="text-sm text-gray-500">Your Personal Event Manager from {venueName}</p>
          <div className="flex items-center gap-4 mt-1 text-sm">
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
