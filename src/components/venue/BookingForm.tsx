
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format, addDays, isBefore, isAfter, parse, startOfDay, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  CalendarCheck, 
  BadgeInfo, 
  Loader2,
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

interface BookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  ownerId: string;
  ownerName: string;
  bookedTimeSlots?: Record<string, string[]>;
  isLoading?: boolean;
  fullyBookedDates?: string[];
}

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'cash', name: 'Cash', icon: <Banknote className="w-4 h-4" /> }
];

const BookingForm = ({ 
  venueId, 
  venueName, 
  pricePerHour = 0, 
  ownerId,
  ownerName,
  bookedTimeSlots = {},
  isLoading = false,
  fullyBookedDates = []
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
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  
  // New fields for customer details
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  
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
  
  useEffect(() => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (fullyBookedDates.includes(dateStr)) {
        setShowUnavailableDialog(true);
        setDate(undefined);
        return;
      }
      
      setDisplayDate(format(date, 'EEEE, MMMM d, yyyy'));
      setStartTime('');
      setEndTime('');
      
      updateAvailableStartTimes(dateStr);
    } else {
      setDisplayDate('');
      setAvailableStartTimes([]);
      setAvailableEndTimes([]);
    }
  }, [date, bookedTimeSlots, fullyBookedDates]);
  
  useEffect(() => {
    if (startTime && date) {
      updateAvailableEndTimes(startTime);
    } else {
      setEndTime('');
      setAvailableEndTimes([]);
    }
  }, [startTime, date]);
  
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
  
  const updateAvailableStartTimes = (dateStr: string) => {
    const bookedSlots = bookedTimeSlots[dateStr] || [];
    
    if (bookedSlots.length >= TIME_SLOTS.length - 1) {
      setAvailableStartTimes([]);
      return;
    }
    
    const bookedStartTimes = new Set();
    const bookedEndTimes = new Set();
    
    bookedSlots.forEach(slot => {
      const [start, end] = slot.split(' - ');
      
      for (let hour = parseInt(start.split(':')[0]); hour < parseInt(end.split(':')[0]); hour++) {
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
        bookedStartTimes.add(hourStr);
      }
    });
    
    const available = TIME_SLOTS.filter(time => {
      if (date && isSameDay(date, new Date()) && isPastTime(time)) {
        return false;
      }
      
      return !bookedStartTimes.has(time);
    });
    
    setAvailableStartTimes(available);
  };
  
  const updateAvailableEndTimes = (start: string) => {
    if (!date || !start) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedSlots = bookedTimeSlots[dateStr] || [];
    const startHour = parseInt(start.split(':')[0]);
    const available: string[] = [];
    
    let nextBookedTime = 22;
    
    bookedSlots.forEach(slot => {
      const [bookedStart] = slot.split(' - ');
      const bookedHour = parseInt(bookedStart.split(':')[0]);
      
      if (bookedHour > startHour && bookedHour < nextBookedTime) {
        nextBookedTime = bookedHour;
      }
    });
    
    for (let i = startHour + 1; i <= Math.min(22, nextBookedTime); i++) {
      available.push(`${i.toString().padStart(2, '0')}:00`);
    }
    
    setAvailableEndTimes(available);
  };
  
  const isPastTime = (time: string) => {
    const now = new Date();
    const [hour] = time.split(':').map(Number);
    return now.getHours() >= hour;
  };
  
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };
  
  const checkTimeSlotAvailability = async (dateStr: string, startTime: string, endTime: string) => {
    setIsCheckingAvailability(true);
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId)
        .eq('booking_date', dateStr)
        .in('status', ['confirmed', 'pending']);
        
      if (error) throw error;
      
      const hasFullDayBooking = data.some(booking => 
        booking.start_time === '09:00' && booking.end_time === '22:00'
      );
      
      if (hasFullDayBooking) {
        return { isAvailable: false };
      }
      
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      
      const hasConflict = data.some(booking => {
        const bookingStartHour = parseInt(booking.start_time.split(':')[0]);
        const bookingEndHour = parseInt(booking.end_time.split(':')[0]);
        
        return (startHour < bookingEndHour && endHour > bookingStartHour);
      });
      
      return { isAvailable: !hasConflict };
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return { isAvailable: false };
    } finally {
      setIsCheckingAvailability(false);
    }
  };

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
      
      const { isAvailable } = await checkTimeSlotAvailability(formattedDate, startTime, endTime);
      
      if (!isAvailable) {
        setShowUnavailableDialog(true);
        setDate(undefined);
        setIsBooking(false);
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
      
      // Create the booking
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
            status: 'confirmed',
            customer_email: customerEmail,
            customer_phone: customerPhone,
            payment_method: paymentMethod
          }
        ])
        .select();
      
      if (error) throw error;
      
      setBookingSuccess(true);
      
      // Create notification for the venue owner
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: ownerId,
            type: 'booking_request',
            title: 'New Confirmed Booking',
            message: `You have a new confirmed booking for ${venueName} on ${format(date, 'MMM d, yyyy')} from ${startTime} to ${endTime}`,
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
  
  const handleReset = () => {
    setDate(undefined);
    setStartTime('');
    setEndTime('');
    setGuests(1);
    setSpecialRequests('');
    setBookingSuccess(false);
  };
  
  const disabledDays = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) {
      return true;
    }
    
    const dateStr = format(day, 'yyyy-MM-dd');
    return fullyBookedDates.includes(dateStr);
  };
  
  if (bookingSuccess) {
    return (
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Booking Successful!</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your booking for {venueName} on {displayDate} from {startTime} to {endTime} has been automatically confirmed.
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
      
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="sm:max-w-md bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Time Slot Unavailable
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-red-700 dark:text-red-300">
            Sorry, this time slot is already booked or has been reserved by another user.
            Please select a different date or time.
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

export default BookingForm;
