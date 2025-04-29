import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isWithinInterval, setHours, setMinutes } from 'date-fns';
import { Calendar as CalendarIcon, ClockIcon, UsersIcon } from 'lucide-react';
import { DateRange } from "react-day-picker";

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider"
import { Venue } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useBlockedDates } from '@/hooks/useBlockedDates';

interface BookingFormProps {
  venue: Venue;
  defaultBookingType?: 'hourly' | 'full-day';
}

const BookingForm: React.FC<BookingFormProps> = ({ venue, defaultBookingType = 'full-day' }) => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 2),
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [guests, setGuests] = useState<number>(1);
  const [bookingType, setBookingType] = useState<'hourly' | 'full-day'>(defaultBookingType);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [dayBookedDates, setDayBookedDates] = useState<string[]>([]);
  const [hourlyBookedDates, setHourlyBookedDates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use our blocked dates hook to get venue owner blocked dates
  const { blockedDates, isLoading: isLoadingBlockedDates, isDateBlocked, isDateAndTimeBlocked } = useBlockedDates(venue?.id);

  useEffect(() => {
    if (venue) {
      fetchBookedDates(venue.id);
    }
  }, [venue]);

  const fetchBookedDates = async (venueId: string) => {
    // Here we would fetch actual booking data from the API
    // For now, let's add some sample data
    const today = new Date();
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date, status, start_time, end_time')
        .eq('venue_id', venueId);

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      if (data) {
        const booked: string[] = [];
        const fullyBooked: string[] = [];
        const dayBooked: string[] = [];
        const hourlyBooked: string[] = [];

        data.forEach(booking => {
          if (booking.status !== 'cancelled') {
            booked.push(booking.booking_date);
            
            if (booking.start_time === '00:00' && booking.end_time === '23:59') {
              dayBooked.push(booking.booking_date);
              fullyBooked.push(booking.booking_date);
            } else {
              hourlyBooked.push(booking.booking_date);
            }
          }
        });

        setBookedDates(booked);
        setFullyBookedDates(fullyBooked);
        setDayBookedDates(dayBooked);
        setHourlyBookedDates(hourlyBooked);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    // Only set the date if it's not blocked by the owner
    if (date && !isDateBlocked(date)) {
      setSelectedDate(date);
    } else if (date && isDateBlocked(date)) {
      toast({
        title: "Date unavailable",
        description: "This date has been blocked by the venue owner and is not available for booking.",
        variant: "destructive",
      });
    } else {
      setSelectedDate(date);
    }
  };

  const handleBookingTypeChange = (value: string) => {
    if (value === 'hourly' || value === 'full-day') {
      setBookingType(value);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "You must be logged in to make a booking.",
        description: "Please log in or create an account to continue.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Please select a date.",
        variant: "destructive",
      });
      return;
    }

    // Check if the date is blocked by venue owner
    if (isDateBlocked(selectedDate)) {
      toast({
        title: "Date unavailable",
        description: "This date has been blocked by the venue owner and is not available for booking.",
        variant: "destructive",
      });
      return;
    }
    
    // For hourly bookings, also check if the specific time slot is blocked
    if (bookingType === 'hourly' && isDateAndTimeBlocked(selectedDate, startTime, endTime)) {
      toast({
        title: "Time slot unavailable",
        description: "This time slot has been blocked by the venue owner and is not available for booking.",
        variant: "destructive",
      });
      return;
    }
    
    // Check against existing bookings
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (bookingType === 'full-day' && 
        (fullyBookedDates.includes(dateStr) || dayBookedDates.includes(dateStr))) {
      toast({
        title: "Date already booked",
        description: "This date is already booked for full-day rental.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!venue || !selectedDate) {
        throw new Error("Missing venue or date");
      }

      const totalPrice = venue.starting_price || 100;

      const item = {
        id: venue.id,
        name: venue.name,
        imageUrl: venue.gallery_images?.[0] || '/placeholder.svg',
        price: totalPrice,
        quantity: 1,
        bookingDetails: {
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: startTime,
          endTime: endTime,
          guests: guests,
          bookingType: bookingType,
        },
      };

      addItem(item);

      toast({
        title: "Added to cart!",
        description: "Your booking has been added to the cart.",
      });
      navigate('/cart');
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Something went wrong!",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4" />
          <p className="text-sm font-medium">
            {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4" />
          <p className="text-sm font-medium">
            {bookingType === 'hourly' ? `${startTime} - ${endTime}` : 'Full Day'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <UsersIcon className="h-4 w-4" />
          <p className="text-sm font-medium">{guests} Guests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BookingCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          bookedDates={bookedDates}
          fullyBookedDates={fullyBookedDates}
          dayBookedDates={dayBookedDates}
          hourlyBookedDates={hourlyBookedDates}
          blockedDates={blockedDates}
          bookingType={bookingType}
        />

        <Select value={bookingType} onValueChange={handleBookingTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select booking type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full-day">Full Day</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {bookingType === 'hourly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-time">Start Time</Label>
            <Input
              type="time"
              id="start-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="end-time">End Time</Label>
            <Input
              type="time"
              id="end-time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="guests">Number of Guests</Label>
        <Slider
          id="guests"
          defaultValue={[1]}
          max={venue.max_capacity || 10}
          min={1}
          step={1}
          onValueChange={(value) => setGuests(value[0])}
        />
        <p className="text-sm text-muted-foreground">
          {guests} {guests === 1 ? 'guest' : 'guests'}
        </p>
      </div>

      <Button 
        onClick={handleAddToCart} 
        disabled={
          isSubmitting || 
          isLoadingBlockedDates || 
          (selectedDate && isDateBlocked(selectedDate)) ||
          (selectedDate && bookingType === 'full-day' && 
            (fullyBookedDates.includes(format(selectedDate, 'yyyy-MM-dd')) || 
             dayBookedDates.includes(format(selectedDate, 'yyyy-MM-dd'))))
        }
      >
        {isSubmitting ? 'Adding to Cart...' : 'Add to Cart'}
      </Button>
    </div>
  );
};

export default BookingForm;
