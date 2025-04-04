
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format, addDays, isBefore, isAfter, parse, startOfDay, addMonths } from 'date-fns';
import { 
  CalendarIcon, 
  Users, 
  CalendarCheck, 
  CalendarRange,
  BadgeInfo, 
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MultiDayBookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  minCapacity?: number;
  maxCapacity?: number;
  bookedDates?: string[];
  isLoading?: boolean;
}

const MultiDayBookingForm = ({ 
  venueId, 
  venueName, 
  pricePerHour = 0,
  minCapacity = 1,
  maxCapacity = 100,
  bookedDates = [],
  isLoading = false
}: MultiDayBookingFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [displayDate, setDisplayDate] = useState<string>('');
  const [guests, setGuests] = useState(Math.max(minCapacity, 1));
  const [totalPrice, setTotalPrice] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  
  // Base price calculation (assuming daily rate is 8 * hourly rate)
  const dailyRate = pricePerHour * 8;
  
  // Reset form when changing date
  useEffect(() => {
    if (date) {
      setDisplayDate(format(date, 'EEEE, MMMM d, yyyy'));
      calculateTotalPrice();
    } else {
      setDisplayDate('');
    }
  }, [date]);
  
  // Calculate price when date or guests change
  useEffect(() => {
    calculateTotalPrice();
  }, [date, guests, pricePerHour]);
  
  const calculateTotalPrice = () => {
    if (!date || !dailyRate) {
      setTotalPrice(0);
      return;
    }
    
    // Base price for full day
    let price = dailyRate;
    
    // Extra charge for more guests
    if (guests > minCapacity) {
      const extraGuests = guests - minCapacity;
      const extraCharge = extraGuests * (dailyRate * 0.1); // 10% extra per additional guest
      price += extraCharge;
    }
    
    // Weekend pricing (Friday and Saturday) - 20% premium
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
      price *= 1.2;
    }
    
    setTotalPrice(Math.round(price));
  };

  // Check if the date is already fully booked
  const checkFullDayBookingConflict = async (dateStr: string) => {
    setIsCheckingAvailability(true);
    
    try {
      // Check for existing full-day bookings
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId)
        .eq('booking_date', dateStr)
        .in('status', ['confirmed', 'pending'])
        .not('id', 'is', null); // Exclude any null IDs just to be safe
        
      if (error) throw error;
      
      // Check if there's a full day booking
      // Full day bookings would typically have specific start/end times like 9:00-22:00
      const hasFullDayBooking = existingBookings.some(booking => 
        booking.start_time === '09:00' && booking.end_time === '22:00'
      );
      
      // Check if there are any bookings that would conflict with a full day booking
      const hasConflictingBookings = existingBookings.length > 0;
      
      return { isAvailable: !hasFullDayBooking && !hasConflictingBookings, existingBookings };
      
    } catch (error) {
      console.error("Error checking booking availability:", error);
      toast({
        title: "Error",
        description: "Could not check venue availability. Please try again.",
        variant: "destructive",
      });
      return { isAvailable: false, existingBookings: [] };
    } finally {
      setIsCheckingAvailability(false);
    }
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
    
    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date for your booking.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsBooking(true);
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Check if the date is available before creating booking
      const { isAvailable, existingBookings } = await checkFullDayBookingConflict(formattedDate);
      
      if (!isAvailable) {
        toast({
          title: "Date Unavailable",
          description: `Sorry, this date is already booked or has conflicting bookings.`,
          variant: "destructive",
        });
        setIsBooking(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            venue_id: venueId,
            venue_name: venueName,
            user_id: user.id,
            booking_date: formattedDate,
            start_time: '09:00',
            end_time: '22:00',
            guests,
            total_price: totalPrice,
            special_requests: specialRequests || null,
            status: 'confirmed' // Auto-confirm since we've already checked for conflicts
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
            user_id: 'owner_id_here', // This should be dynamically set based on the venue owner
            type: 'booking_request',
            title: 'New Full-Day Booking',
            message: `You have a new full-day booking for ${venueName} on ${format(date, 'MMM d, yyyy')}`,
            data: {
              venue_id: venueId,
              venue_name: venueName,
              booking_date: formattedDate,
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
    setGuests(Math.max(minCapacity, 1));
    setSpecialRequests('');
    setBookingSuccess(false);
  };
  
  // Convert booked dates string array to Date objects
  const disabledDays = (day: Date) => {
    // Disable past days
    if (isBefore(day, startOfDay(new Date()))) {
      return true;
    }
    
    // Disable already booked days
    const dateStr = format(day, 'yyyy-MM-dd');
    return bookedDates.includes(dateStr);
  };
  
  // Show success confirmation
  if (bookingSuccess) {
    return (
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Booking Successful!</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your full-day booking for {venueName} on {displayDate} has been automatically confirmed as the date was available.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You can view and manage your booking in your bookings page.
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
                <CalendarRange className="mr-2 h-4 w-4" />
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
                toDate={addMonths(new Date(), 3)}
              />
            </PopoverContent>
          </Popover>
          
          <p className="text-xs text-muted-foreground mt-1">
            Booking available up to 3 months in advance. Grayed out dates are already booked.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Guests
          </label>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setGuests(Math.max(minCapacity, guests - 1))}
              className="rounded-r-none"
              disabled={guests <= minCapacity}
            >
              -
            </Button>
            <Input
              type="number"
              min={minCapacity}
              max={maxCapacity}
              value={guests}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= minCapacity && value <= maxCapacity) {
                  setGuests(value);
                }
              }}
              className="text-center rounded-none w-16 border-x-0"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setGuests(Math.min(maxCapacity, guests + 1))}
              className="rounded-l-none"
              disabled={guests >= maxCapacity}
            >
              +
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This venue accommodates {minCapacity} to {maxCapacity} guests
          </p>
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

      {date && (
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
                <span className="text-findvenue-text-muted">Duration:</span>
                <span>Full Day (9:00 AM - 10:00 PM)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-findvenue-text-muted">Guests:</span>
                <span>{guests}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-findvenue-text-muted">Base Rate:</span>
                <span>SAR {dailyRate} / day</span>
              </div>
              
              {guests > minCapacity && (
                <div className="flex justify-between items-center">
                  <span className="text-findvenue-text-muted">Additional Guests:</span>
                  <span>+SAR {Math.round((guests - minCapacity) * (dailyRate * 0.1))}</span>
                </div>
              )}
              
              {date && (date.getDay() === 5 || date.getDay() === 6) && (
                <div className="flex justify-between items-center">
                  <span className="text-findvenue-text-muted">Weekend Premium:</span>
                  <span>+20%</span>
                </div>
              )}
              
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
              disabled={isBooking || isCheckingAvailability}
            >
              {isBooking || isCheckingAvailability ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCheckingAvailability ? "Checking Availability..." : "Processing..."}
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
      
      <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
          Full day bookings are automatically confirmed when the date is available. You and the venue owner will be notified.
        </AlertDescription>
      </Alert>
    </form>
  );
};

export default MultiDayBookingForm;
