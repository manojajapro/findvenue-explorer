import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format, addDays, isBefore, isAfter, parse, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  CalendarCheck, 
  BadgeInfo, 
  Loader2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface BookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  ownerId: string;
  ownerName: string;
  bookedTimeSlots?: Record<string, string[]>;
  isLoading?: boolean;
}

// Time slots available for booking
const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const BookingForm = ({ 
  venueId, 
  venueName, 
  pricePerHour = 0, 
  ownerId,
  ownerName,
  bookedTimeSlots = {},
  isLoading = false
}: BookingFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [displayDate, setDisplayDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [duration, setDuration] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [availableStartTimes, setAvailableStartTimes] = useState<string[]>([]);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Reset form when changing date
  useEffect(() => {
    if (date) {
      setDisplayDate(format(date, 'EEEE, MMMM d, yyyy'));
      setStartTime('');
      setEndTime('');
      
      // Get available start times for the selected date
      updateAvailableStartTimes(format(date, 'yyyy-MM-dd'));
    } else {
      setDisplayDate('');
      setAvailableStartTimes([]);
      setAvailableEndTimes([]);
    }
  }, [date, bookedTimeSlots]);
  
  // Update end time options when start time changes
  useEffect(() => {
    if (startTime) {
      updateAvailableEndTimes(startTime);
    } else {
      setEndTime('');
      setAvailableEndTimes([]);
    }
  }, [startTime, date]);
  
  // Calculate price and duration when start/end times change
  useEffect(() => {
    if (startTime && endTime) {
      const start = parseInt(startTime.split(':')[0]);
      const end = parseInt(endTime.split(':')[0]);
      const hours = end - start;
      
      setDuration(hours);
      setTotalPrice(pricePerHour * hours);
    } else {
      setDuration(0);
      setTotalPrice(0);
    }
  }, [startTime, endTime, pricePerHour]);
  
  // Update available start times based on bookings
  const updateAvailableStartTimes = (dateStr: string) => {
    const bookedSlots = bookedTimeSlots[dateStr] || [];
    const bookedStartTimes = new Set();
    
    // Extract start times from booked slots to exclude them
    bookedSlots.forEach(slot => {
      const [start] = slot.split(' - ');
      bookedStartTimes.add(start);
    });
    
    // Filter out already booked start times
    const available = TIME_SLOTS.filter(time => {
      // Don't show past times for today
      if (date && isSameDay(date, new Date()) && isPastTime(time)) {
        return false;
      }
      
      // Don't show already booked times
      return !bookedStartTimes.has(time);
    });
    
    setAvailableStartTimes(available);
  };
  
  // Update available end times based on start time
  const updateAvailableEndTimes = (start: string) => {
    if (!date || !start) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedSlots = bookedTimeSlots[dateStr] || [];
    const startHour = parseInt(start.split(':')[0]);
    const available: string[] = [];
    
    // Find the next booked time after the selected start time
    let nextBookedTime = 24; // Default to end of day
    
    bookedSlots.forEach(slot => {
      const [bookedStart] = slot.split(' - ');
      const bookedHour = parseInt(bookedStart.split(':')[0]);
      
      if (bookedHour > startHour && bookedHour < nextBookedTime) {
        nextBookedTime = bookedHour;
      }
    });
    
    // Add available end times (must be after start time and before next booking)
    for (let i = startHour + 1; i <= Math.min(22, nextBookedTime); i++) {
      available.push(`${i.toString().padStart(2, '0')}:00`);
    }
    
    setAvailableEndTimes(available);
  };
  
  // Check if time is in the past
  const isPastTime = (time: string) => {
    const now = new Date();
    const [hour] = time.split(':').map(Number);
    return now.getHours() >= hour;
  };
  
  // Check if day is same as current date
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  // Handler for submitting the booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to book a venue.",
        variant: "destructive",
      });
      return;
    }
    
    if (!date || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please select a date and time for your booking.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsBooking(true);
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            venue_id: venueId,
            venue_name: venueName,
            user_id: user.id,
            booking_date: formattedDate,
            start_time: startTime,
            end_time: endTime,
            guests,
            total_price: totalPrice,
            special_requests: specialRequests || null,
            status: 'pending'
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Show success message and reset form
      setBookingSuccess(true);
      
      // Create notification for venue owner
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: ownerId,
            type: 'booking_request',
            title: 'New Booking Request',
            message: `You have a new booking request for ${venueName} on ${format(date, 'MMM d, yyyy')}`,
            data: {
              venue_id: venueId,
              venue_name: venueName,
              booking_date: formattedDate,
              start_time: startTime,
              end_time: endTime,
              booking_id: data?.[0]?.id
            }
          }
        ]);
        
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };
  
  // Reset the form
  const handleReset = () => {
    setDate(undefined);
    setStartTime('');
    setEndTime('');
    setGuests(1);
    setSpecialRequests('');
    setBookingSuccess(false);
  };
  
  // Disable past dates and fully booked dates
  const disabledDays = (day: Date) => {
    // Disable past days
    if (isBefore(day, startOfDay(new Date()))) {
      return true;
    }
    
    // Disable fully booked days
    const dateStr = format(day, 'yyyy-MM-dd');
    const isFullyBooked = bookedTimeSlots[dateStr]?.length === TIME_SLOTS.length;
    
    return isFullyBooked;
  };
  
  // Show success confirmation
  if (bookingSuccess) {
    return (
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Booking Request Sent!</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your booking request for {venueName} on {displayDate} from {startTime} to {endTime} has been sent to the venue owner.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You'll receive a notification once the venue owner confirms your booking.
          </p>
          <Button
            onClick={handleReset}
            className="mt-2"
          >
            Make Another Booking
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4 mx-auto" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Date
          </label>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'EEEE, MMMM d, yyyy') : <span>Select a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={disabledDays}
                initialFocus
                fromDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {date && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Time
              </label>
              <Select
                value={startTime}
                onValueChange={setStartTime}
                disabled={availableStartTimes.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {availableStartTimes.length > 0 ? (
                    availableStartTimes.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No available times
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                End Time
              </label>
              <Select
                value={endTime}
                onValueChange={setEndTime}
                disabled={!startTime || availableEndTimes.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {availableEndTimes.length > 0 ? (
                    availableEndTimes.map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Select start time first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Guests
          </label>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setGuests(Math.max(1, guests - 1))}
              className="rounded-r-none"
            >
              -
            </Button>
            <Input
              type="number"
              min="1"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
              className="text-center rounded-none w-16 border-x-0"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setGuests(guests + 1)}
              className="rounded-l-none"
            >
              +
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Special Requests (Optional)
          </label>
          <Textarea
            placeholder="Any special requirements or setup needs?"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            className="resize-none"
          />
        </div>
      </div>

      {startTime && endTime && (
        <Card className="mt-4 bg-findvenue-surface/20 dark:bg-findvenue-card-bg border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-findvenue-text-muted">Date:</span>
                <span>{displayDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-findvenue-text-muted">Time:</span>
                <span>{startTime} - {endTime} ({duration} hour{duration !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-findvenue-text-muted">Guests:</span>
                <span>{guests}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-findvenue-text-muted">Rate:</span>
                <span>SAR {pricePerHour} / hour</span>
              </div>
              <div className="border-t border-white/10 mt-2 pt-2 flex justify-between items-center font-medium">
                <span>Total:</span>
                <span>SAR {totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button 
              className="w-full bg-findvenue hover:bg-findvenue-dark"
              type="submit"
              disabled={isBooking}
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Book Now
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </form>
  );
};

export default BookingForm;
