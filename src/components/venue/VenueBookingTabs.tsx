
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

  // Fetch existing bookings for this venue to disable already booked dates/times
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoadingBookings(true);
        const { data, error } = await supabase
          .from('bookings')
          .select('booking_date, start_time, end_time, status')
          .eq('venue_id', venueId)
          .eq('status', 'confirmed');
          
        if (error) {
          console.error('Error fetching bookings:', error);
          return;
        }

        // Process confirmed bookings to track booked dates and time slots
        const dates: string[] = [];
        const timeSlots: Record<string, string[]> = {};
        
        data.forEach(booking => {
          const dateStr = booking.booking_date;
          const timeSlot = `${booking.start_time} - ${booking.end_time}`;
          
          // Track fully booked dates for day bookings
          if (!dates.includes(dateStr)) {
            dates.push(dateStr);
          }
          
          // Track booked time slots for hourly bookings
          if (!timeSlots[dateStr]) {
            timeSlots[dateStr] = [];
          }
          
          if (!timeSlots[dateStr].includes(timeSlot)) {
            timeSlots[dateStr].push(timeSlot);
          }
        });
        
        setBookedDates(dates);
        setBookedTimeSlots(timeSlots);
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
          />
        </TabsContent>
        
        <TabsContent value="daily">
          <MultiDayBookingForm 
            venueId={venueId} 
            venueName={venueName} 
            pricePerHour={pricePerHour}
            minCapacity={minCapacity}
            maxCapacity={maxCapacity}
            bookedDates={bookedDates}
            isLoading={isLoadingBookings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
