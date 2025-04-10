import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Check, CalendarIcon, BadgeInfo, User } from 'lucide-react';
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate';

interface MultiDayBookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour: number;
  minCapacity?: number;
  maxCapacity?: number;
  bookedDates: string[];
  isLoading: boolean;
  autoConfirm?: boolean;
}

export default function MultiDayBookingForm({
  venueId,
  venueName,
  pricePerHour,
  minCapacity = 1,
  maxCapacity = 100,
  bookedDates,
  isLoading,
  autoConfirm = false
}: MultiDayBookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyVenueOwner } = useBookingStatusUpdate(() => Promise.resolve());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState(minCapacity);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to book this venue",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    const bookingDateString = format(selectedDate, 'yyyy-MM-dd');
    
    if (isBefore(selectedDate, new Date()) && !isAfter(selectedDate, addDays(new Date(), -1))) {
      toast({
        title: "Error",
        description: "Cannot book dates in the past",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const calculatedPrice = pricePerHour * 24;
      
      const bookingData = {
        user_id: user.id,
        venue_id: venueId,
        booking_date: bookingDateString,
        guests: guests,
        start_time: '00:00',
        end_time: '23:59',
        special_requests: specialRequests,
        status: autoConfirm ? 'confirmed' : 'pending',
        total_price: calculatedPrice,
        venue_name: venueName,
        user_name: user.user_metadata?.full_name || user.email,
        user_email: user.email,
        booking_type: 'full-day'
      };
      
      console.log('Creating full day booking with data:', bookingData);

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();

      if (error) {
        console.error("Error creating booking:", error);
        throw error;
      }
      
      console.log('Successfully created booking:', data);
      
      if (data && data[0]) {
        console.log('Notifying venue owner about new booking');
        const notificationResult = await notifyVenueOwner(data[0]);
        console.log('Notification result:', notificationResult);
      }

      toast({
        title: "Booking Successful",
        description: autoConfirm 
          ? "Your booking has been confirmed." 
          : "Your booking request has been sent to the venue owner.",
        variant: "default",
      });

      setSelectedDate(undefined);
      setGuests(minCapacity);
      setSpecialRequests('');
      
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "There was an error processing your booking.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const newTotalPrice = pricePerHour * 24;
      setTotalPrice(newTotalPrice);
    } else {
      setTotalPrice(0);
    }
  };

  const formattedBookedDates = bookedDates.map(date => {
    try {
      if (date && date instanceof Date) return date;
      
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
      
      if (typeof date === 'string' && date.includes('-')) {
        return parseISO(date);
      }
      
      return new Date(2000, 0, 1);
    } catch (e) {
      console.error("Error parsing date:", e, date);
      return new Date(2000, 0, 1);
    }
  });

  const isDateDisabled = (date: Date) => {
    return formattedBookedDates.some(bookedDate => 
      format(bookedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ) || isBefore(date, new Date()) && !isAfter(date, addDays(new Date(), -1));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2 flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5 text-findvenue" /> 
          Select Date
        </h3>
        <p className="text-sm text-findvenue-text-muted mb-4">
          Choose a date for your full-day booking
        </p>
        <Card>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              className="rounded-md border"
              disabled={isDateDisabled}
            />
          </CardContent>
        </Card>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <User className="mr-2 h-5 w-5 text-findvenue" /> 
          Booking Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="guests" className="block text-sm font-medium mb-2">
              Number of Guests
            </label>
            <Input
              id="guests"
              type="number"
              min={minCapacity}
              max={maxCapacity}
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-findvenue-text-muted mt-1">
              Min: {minCapacity}, Max: {maxCapacity} guests
            </p>
          </div>
          
          <div>
            <label htmlFor="specialRequests" className="block text-sm font-medium mb-2">
              Special Requests (Optional)
            </label>
            <Input
              id="specialRequests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requirements or notes..."
              className="w-full"
            />
          </div>
        </div>
      </div>
      
      <div>
        <Card className="bg-findvenue/5">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <BadgeInfo className="mr-2 h-5 w-5 text-findvenue" /> 
              Booking Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Not selected'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">Full Day (24 hours)</span>
              </div>
              
              <div className="flex justify-between">
                <span>Guests:</span>
                <span className="font-medium">{guests}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between text-base">
                <span className="font-medium">Total Price:</span>
                <span className="font-bold text-findvenue">SAR {totalPrice.toFixed(2)}</span>
              </div>
              
              {autoConfirm && (
                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                  <Check className="h-3 w-3" /> Auto-confirmation enabled
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-findvenue hover:bg-findvenue-dark"
        disabled={isSubmitting || !selectedDate}
      >
        {isSubmitting ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Processing...
          </>
        ) : autoConfirm ? (
          'Book Now'
        ) : (
          'Request Booking'
        )}
      </Button>
    </form>
  );
}
