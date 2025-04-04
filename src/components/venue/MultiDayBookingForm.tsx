
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
  Info,
  AlertCircle,
  Mail,
  Phone,
  CreditCard,
  Banknote
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MultiDayBookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  minCapacity?: number;
  maxCapacity?: number;
  bookedDates?: string[];
  isLoading?: boolean;
}

const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'cash', name: 'Cash', icon: <Banknote className="w-4 h-4" /> }
];

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
  const [allBookedDates, setAllBookedDates] = useState<string[]>(bookedDates || []);
  const [unavailableDatesLoaded, setUnavailableDatesLoaded] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  
  // Customer contact fields
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  
  // Base price calculation (assuming daily rate is 8 * hourly rate)
  const dailyRate = pricePerHour * 8;
  
  // Load all booked dates on component mount
  useEffect(() => {
    fetchAllBookedDates();
  }, [venueId]);
  
  // Get user profile info if logged in
  useEffect(() => {
    if (user) {
      const getUserProfile = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('email, phone')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setCustomerEmail(data.email || '');
          setCustomerPhone(data.phone || '');
        }
      };
      
      getUserProfile();
    }
  }, [user]);
  
  // Reset form when changing date
  useEffect(() => {
    if (date) {
      setDisplayDate(format(date, 'EEEE, MMMM d, yyyy'));
      calculateTotalPrice();

      // When a date is selected, check availability immediately
      checkDateAvailability(date);
    } else {
      setDisplayDate('');
    }
  }, [date]);
  
  // Calculate price when date or guests change
  useEffect(() => {
    calculateTotalPrice();
  }, [date, guests, pricePerHour]);

  // Fetch all booked dates from the venue
  const fetchAllBookedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time')
        .eq('venue_id', venueId)
        .in('status', ['confirmed', 'pending']);
      
      if (error) throw error;
      
      if (data) {
        // Process the data to get all dates that should be unavailable
        const unavailableDates = processBookedDates(data);
        setAllBookedDates(unavailableDates);
        setUnavailableDatesLoaded(true);
      }
    } catch (err) {
      console.error("Error fetching booked dates:", err);
    }
  };
  
  // Process booked dates to determine which ones should be unavailable
  const processBookedDates = (bookings: any[]) => {
    const fullyBookedDates = new Set<string>();
    const partiallyBookedDates = new Map<string, number>(); // date -> hours booked
    
    bookings.forEach(booking => {
      const dateStr = booking.booking_date;
      
      // Check if it's a full-day booking (9:00-22:00)
      if (booking.start_time === '09:00' && booking.end_time === '22:00') {
        fullyBookedDates.add(dateStr);
      } 
      // Otherwise add hours to partially booked dates
      else {
        const startHour = parseInt(booking.start_time.split(':')[0]);
        const endHour = parseInt(booking.end_time.split(':')[0]);
        const hoursBooked = endHour - startHour;
        
        const currentHours = partiallyBookedDates.get(dateStr) || 0;
        partiallyBookedDates.set(dateStr, currentHours + hoursBooked);
      }
    });
    
    // Check partially booked dates to see if they're effectively fully booked
    partiallyBookedDates.forEach((hours, dateStr) => {
      // If more than 50% of available hours (9:00-22:00 = 13 hours) are booked
      // Consider the day unavailable for full-day booking
      if (hours > 6) {
        fullyBookedDates.add(dateStr);
      }
    });
    
    return Array.from(fullyBookedDates);
  };
  
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

  // Check if the selected date is available
  const checkDateAvailability = async (selectedDate: Date) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // First check if the date is in our allBookedDates array
    if (allBookedDates.includes(dateStr)) {
      setShowUnavailableDialog(true);
      setDate(undefined);
      return false;
    }
    
    // If not already marked as unavailable, do a real-time check
    setIsCheckingAvailability(true);
    
    try {
      const { isAvailable } = await checkFullDayBookingConflict(dateStr);
      
      if (!isAvailable) {
        setShowUnavailableDialog(true);
        setDate(undefined);
        
        // Add to our list of unavailable dates
        if (!allBookedDates.includes(dateStr)) {
          setAllBookedDates([...allBookedDates, dateStr]);
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking date availability:", error);
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
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
    
    if (!customerEmail || !customerPhone) {
      toast({
        title: "Error",
        description: "Please provide your contact details.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsBooking(true);
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Final availability check before creating booking
      const { isAvailable } = await checkFullDayBookingConflict(formattedDate);
      
      if (!isAvailable) {
        setShowUnavailableDialog(true);
        setIsBooking(false);
        setDate(undefined);
        return;
      }
      
      // Update user profile with contact info if needed
      if (user.email !== customerEmail || customerPhone) {
        await supabase
          .from('user_profiles')
          .update({
            phone: customerPhone
          })
          .eq('id', user.id);
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
            status: 'confirmed', // Auto-confirm since we've already checked for conflicts
            customer_email: customerEmail,
            customer_phone: customerPhone,
            payment_method: paymentMethod
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Add this date to our booked dates list
      setAllBookedDates([...allBookedDates, formattedDate]);
      
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
    return allBookedDates.includes(dateStr);
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
  if (isLoading || !unavailableDatesLoaded) {
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
                modifiers={{ 
                  booked: (date) => allBookedDates.includes(format(date, 'yyyy-MM-dd')) 
                }}
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
        
        {/* Customer Contact Information */}
        <div className="space-y-3">
          <h4 className="font-medium">Contact Information</h4>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <div className="relative">
              <Input 
                type="email" 
                placeholder="Your email address" 
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="pl-9"
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone
            </label>
            <div className="relative">
              <Input 
                type="tel" 
                placeholder="Your phone number" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="pl-9"
              />
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payment Method
          </label>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={setPaymentMethod}
            className="flex flex-col space-y-2"
          >
            {PAYMENT_METHODS.map((method) => (
              <div key={method.id} className="flex items-center space-x-2">
                <RadioGroupItem value={method.id} id={`payment-${method.id}`} />
                <Label 
                  htmlFor={`payment-${method.id}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {method.icon}
                  {method.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
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
      
      {/* Unavailable Date Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="sm:max-w-md bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Date Unavailable
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-red-700 dark:text-red-300">
            Sorry, this date is already booked or has conflicting bookings.
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default MultiDayBookingForm;
