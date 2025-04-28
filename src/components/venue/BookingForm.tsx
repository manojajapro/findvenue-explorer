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

  const { blockedDates, isDateBlocked } = useBlockedDates(venue?.id);

  useEffect(() => {
    if (venue) {
      fetchBookedDates(venue.id);
    }
  }, [venue]);

  const fetchBookedDates = async (venueId: string) => {
    const today = new Date();
    const future = addDays(today, 30);

    const booked: string[] = [];
    const fullyBooked: string[] = [];
    const dayBooked: string[] = [];
    const hourlyBooked: string[] = [];

    for (let i = 0; i < 30; i++) {
      const currentDate = addDays(today, i);
      const formattedDate = format(currentDate, 'yyyy-MM-dd');

      if (i % 5 === 0) {
        booked.push(formattedDate);
      }
      if (i % 7 === 0) {
        fullyBooked.push(formattedDate);
      }
      if (i % 10 === 0) {
        dayBooked.push(formattedDate);
      }
      if (i % 12 === 0) {
        hourlyBooked.push(formattedDate);
      }
    }

    setBookedDates(booked);
    setFullyBookedDates(fullyBooked);
    setDayBookedDates(dayBooked);
    setHourlyBookedDates(hourlyBooked);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={
                "w-full justify-start text-left font-normal" +
                (!selectedDate ? "text-muted-foreground" : "")
              }
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) =>
                date < new Date() ||
                (blockedDates && isDateBlocked && isDateBlocked(date))
              }
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>

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

      <Button onClick={handleAddToCart} disabled={isSubmitting}>
        {isSubmitting ? 'Adding to Cart...' : 'Add to Cart'}
      </Button>
    </div>
  );
};

export default BookingForm;
