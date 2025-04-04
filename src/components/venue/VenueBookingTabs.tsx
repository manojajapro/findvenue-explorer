
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingForm from '@/components/venue/BookingForm';
import MultiDayBookingForm from '@/components/venue/MultiDayBookingForm';
import { Calendar, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  const [activeTab, setActiveTab] = useState('hourly');
  const { user } = useAuth();
  const isOwner = user?.id === ownerId;
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<Record<string, string[]>>({});
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [hourlyBookedDates, setHourlyBookedDates] = useState<string[]>([]);
  const [dayBookedDates, setDayBookedDates] = useState<string[]>([]);

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
            b.start_time === '09:00' && b.end_time === '22:00'
          );
          
          if (fullDayBookings.length > 0) {
            dates.push(dateStr);
            fullyBooked.push(dateStr);
            dayBooked.push(dateStr);
            
            // Add all time slots as booked for this date to prevent hourly bookings
            if (!timeSlots[dateStr]) {
              timeSlots[dateStr] = [];
            }
            timeSlots[dateStr].push('09:00 - 22:00');
          } else {
            // Track hourly bookings
            if (!timeSlots[dateStr]) {
              timeSlots[dateStr] = [];
            }
            
            let totalBookedHours = 0;
            
            bookings.forEach(booking => {
              const timeSlot = `${booking.start_time} - ${booking.end_time}`;
              if (!timeSlots[dateStr].includes(timeSlot)) {
                timeSlots[dateStr].push(timeSlot);
              }
              
              // Calculate booked hours
              const startHour = parseInt(booking.start_time.split(':')[0]);
              const endHour = parseInt(booking.end_time.split(':')[0]);
              totalBookedHours += (endHour - startHour);
            });
            
            // If there are any hourly bookings, mark the date
            if (bookings.length > 0) {
              hourlyBooked.push(dateStr);
            }
            
            // If more than 6 hours are booked (considering 13 business hours), 
            // consider the day unavailable for full-day booking
            if (totalBookedHours >= 6) {
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

  return (
    <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
      <h3 className="text-lg font-semibold mb-4">Book this venue</h3>
      
      <Tabs defaultValue="hourly" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="hourly" className="text-xs sm:text-sm flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Hourly Booking</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="text-xs sm:text-sm flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            <span>Day Booking</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="hourly">
          <BookingForm 
            venueId={venueId} 
            venueName={venueName} 
            pricePerHour={pricePerHour} 
            ownerId={ownerId}
            ownerName={ownerName}
            bookedTimeSlots={bookedTimeSlots}
            isLoading={isLoadingBookings}
            fullyBookedDates={[...fullyBookedDates, ...dayBookedDates]} // Disable dates with full-day bookings for hourly booking
          />
        </TabsContent>
        
        <TabsContent value="daily">
          <MultiDayBookingForm 
            venueId={venueId} 
            venueName={venueName} 
            pricePerHour={pricePerHour}
            minCapacity={minCapacity}
            maxCapacity={maxCapacity}
            bookedDates={[...fullyBookedDates, ...hourlyBookedDates]} // Disable dates with hourly bookings for day booking
            isLoading={isLoadingBookings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
