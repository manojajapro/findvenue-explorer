
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingForm from '@/components/venue/BookingForm';
import MultiDayBookingForm from '@/components/venue/MultiDayBookingForm';
import { Calendar, Clock, Calendar as CalendarIcon, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

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

  // Don't allow bookings if venue is not confirmed
  if (venueStatus !== 'confirmed' && venueStatus !== 'active') {
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
      
      <Tabs defaultValue="booking" value={activeTab} onValueChange={setActiveTab as any} className="w-full">
        <TabsList className="grid grid-cols-1 mb-4">
          <div className="flex items-center justify-between p-2 bg-findvenue-surface/30 rounded-lg">
            <div className="font-medium">Booking Type:</div>
            <div className="flex items-center rounded-md overflow-hidden">
              <button 
                className={`px-3 py-1 flex items-center text-sm ${bookingType === 'hourly' 
                  ? 'bg-findvenue text-white' 
                  : 'bg-findvenue-card-bg text-findvenue-text hover:bg-findvenue-surface/50'}`}
                onClick={() => setBookingType('hourly')}
              >
                <Clock className="h-3 w-3 mr-1" />
                Hourly
              </button>
              <button 
                className={`px-3 py-1 flex items-center text-sm ${bookingType === 'full-day' 
                  ? 'bg-findvenue text-white' 
                  : 'bg-findvenue-card-bg text-findvenue-text hover:bg-findvenue-surface/50'}`}
                onClick={() => setBookingType('full-day')}
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Full Day
              </button>
            </div>
          </div>
        </TabsList>
        
        <div className="mt-4">
          {bookingType === 'hourly' ? (
            <BookingForm 
              venueId={venueId} 
              venueName={venueName} 
              pricePerHour={parsedPricePerHour} 
              ownerId={ownerId}
              ownerName={ownerName}
              bookedTimeSlots={bookedTimeSlots}
              isLoading={isLoadingBookings}
              fullyBookedDates={[...fullyBookedDates, ...dayBookedDates]} 
              availableTimeSlots={generateTimeSlots()}
              autoConfirm={true} // Added auto-confirm flag
            />
          ) : (
            <MultiDayBookingForm 
              venueId={venueId} 
              venueName={venueName} 
              pricePerHour={parsedPricePerHour}
              minCapacity={parsedMinCapacity}
              maxCapacity={parsedMaxCapacity}
              bookedDates={[...fullyBookedDates, ...hourlyBookedDates]} 
              isLoading={isLoadingBookings}
              autoConfirm={true} // Added auto-confirm flag
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
