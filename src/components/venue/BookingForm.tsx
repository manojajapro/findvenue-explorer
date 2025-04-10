
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  ownerId: string;
  ownerName: string;
  bookedTimeSlots: Record<string, string[]>;
  isLoading: boolean;
  fullyBookedDates: string[];
  availableTimeSlots: string[];
}

const formSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string().min(1, "Please select a start time"),
  endTime: z.string().min(1, "Please select an end time"),
  guests: z.number().min(1, "At least one guest is required"),
  specialRequests: z.string().optional(),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(5, "Please enter a valid phone number"),
  paymentMethod: z.string().min(1, "Please select a payment method"),
});

export default function BookingForm({
  venueId,
  venueName,
  pricePerHour = 0,
  ownerId,
  ownerName,
  bookedTimeSlots,
  isLoading,
  fullyBookedDates,
  availableTimeSlots
}: BookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricePerPerson, setPricePerPerson] = useState(0);
  const [availableStartTimes, setAvailableStartTimes] = useState<string[]>([]);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);
  const [timeAlertMessage, setTimeAlertMessage] = useState('');
  const [bookingType, setBookingType] = useState<'hourly' | 'half-day' | 'full-day'>('hourly');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guests: 1,
      specialRequests: "",
      customerEmail: user?.email ?? "",
      customerPhone: "",
      paymentMethod: "Cash",
    },
  });

  // Get venue details to get the price per person
  useEffect(() => {
    const fetchVenueDetails = async () => {
      if (venueId) {
        const { data, error } = await supabase
          .from('venues')
          .select('price_per_person')
          .eq('id', venueId)
          .single();
          
        if (data && !error && data.price_per_person) {
          setPricePerPerson(data.price_per_person);
        }
      }
    };
    
    fetchVenueDetails();
  }, [venueId]);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');
  const guests = form.watch('guests') || 1;

  // Update booking type and pricing when start/end times change
  useEffect(() => {
    if (startTime && endTime) {
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      
      if (endHour > startHour) {
        const hours = endHour - startHour;
        
        // Determine booking type based on duration
        if (hours >= 12) {
          setBookingType('full-day');
        } else if (hours >= 6) {
          setBookingType('half-day');
        } else {
          setBookingType('hourly');
        }
        
        // Calculate price based on booking type and guests
        let basePrice = 0;
        
        switch(bookingType) {
          case 'full-day':
            // Full day rate: price_per_person × guests
            basePrice = pricePerPerson * guests;
            break;
          case 'half-day':
            // Half day rate: price_per_person × guests × 0.5
            basePrice = pricePerPerson * guests * 0.5;
            break;
          case 'hourly':
            // Hourly rate: pricePerHour × hours
            basePrice = pricePerHour * hours;
            break;
        }
        
        setTotalPrice(basePrice);
      } else {
        setTotalPrice(0);
      }
    } else {
      setTotalPrice(0);
    }
  }, [startTime, endTime, pricePerHour, bookingType, guests, pricePerPerson]);

  // Check if a date has any hourly bookings
  const hasHourlyBookings = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookedTimeSlots[dateStr] && bookedTimeSlots[dateStr].length > 0;
  };
  
  // Check if a specific date is fully booked (either as a full day or too many hourly slots)
  const isDateFullyBooked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return fullyBookedDates.includes(dateStr);
  };

  // Update available time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const bookedSlots = bookedTimeSlots[dateStr] || [];
      
      // Extract all booked hours for this date
      const bookedHours = new Set<number>();
      
      bookedSlots.forEach(slot => {
        const [start, end] = slot.split(' - ');
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
          bookedHours.add(hour);
        }
      });
      
      // Filter available start times (can't start at or after a booked hour)
      const filtered = availableTimeSlots.filter(timeSlot => {
        const hour = parseInt(timeSlot.split(':')[0]);
        return !bookedHours.has(hour);
      });
      
      setAvailableStartTimes(filtered);
      
      // Update end times based on selected start time
      if (startTime) {
        updateAvailableEndTimes(startTime, bookedHours);
      }
    }
  }, [selectedDate, bookedTimeSlots, availableTimeSlots, startTime]);

  // Update available end times based on selected start time
  const updateAvailableEndTimes = (start: string, bookedHours: Set<number>) => {
    const startHour = parseInt(start.split(':')[0]);
    let foundBookedHour = false;
    
    // End time must be after start time and before the next booked hour
    const filtered = availableTimeSlots.filter(timeSlot => {
      const hour = parseInt(timeSlot.split(':')[0]);
      
      // Once we find a booked hour after our start time, we can't go further
      if (hour > startHour && bookedHours.has(hour) && !foundBookedHour) {
        foundBookedHour = true;
      }
      
      return hour > startHour && (!foundBookedHour || bookedHours.has(hour));
    });
    
    setAvailableEndTimes(filtered);
  };

  // When start time is selected, update end time options
  const handleStartTimeChange = (value: string) => {
    form.setValue('startTime', value);
    form.setValue('endTime', ''); // Reset end time
    
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const bookedSlots = bookedTimeSlots[dateStr] || [];
      
      // Extract all booked hours for this date
      const bookedHours = new Set<number>();
      
      bookedSlots.forEach(slot => {
        const [start, end] = slot.split(' - ');
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
          bookedHours.add(hour);
        }
      });
      
      updateAvailableEndTimes(value, bookedHours);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to book this venue.",
        variant: "destructive",
      });
      return;
    }

    // Final validation to ensure time slot is available
    const dateStr = format(data.date, 'yyyy-MM-dd');
    const bookedSlots = bookedTimeSlots[dateStr] || [];
    const startHour = parseInt(data.startTime.split(':')[0]);
    const endHour = parseInt(data.endTime.split(':')[0]);
    
    let timeConflict = false;
    
    bookedSlots.forEach(slot => {
      const [slotStart, slotEnd] = slot.split(' - ');
      const slotStartHour = parseInt(slotStart.split(':')[0]);
      const slotEndHour = parseInt(slotEnd.split(':')[0]);
      
      // Check if our booking overlaps with an existing booking
      if ((startHour < slotEndHour && endHour > slotStartHour) || 
          (startHour === slotStartHour && endHour === slotEndHour)) {
        timeConflict = true;
        setTimeAlertMessage(`The time slot from ${data.startTime} to ${data.endTime} conflicts with an existing booking.`);
        setShowTimeAlert(true);
        return;
      }
    });
    
    if (timeConflict) return;
    
    setIsSubmitting(true);

    try {
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            venue_id: venueId,
            venue_name: venueName,
            booking_date: format(data.date, 'yyyy-MM-dd'),
            start_time: data.startTime,
            end_time: data.endTime,
            status: 'confirmed', // Auto-confirm all bookings
            total_price: totalPrice,
            guests: data.guests,
            special_requests: data.specialRequests,
            customer_email: data.customerEmail,
            customer_phone: data.customerPhone,
            payment_method: data.paymentMethod,
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      // Send notification to venue owner about new booking
      if (bookingData && bookingData.length > 0) {
        // Notify venue owner about the booking
        try {
          const ownerId = await getVenueOwnerId();
          
          if (ownerId) {
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: ownerId,
                title: 'New Booking',
                message: `New ${bookingType} booking for ${venueName} on ${format(data.date, 'MMM d, yyyy')}`,
                type: 'booking',
                read: false,
                link: '/customer-bookings',
                data: {
                  booking_id: bookingData[0].id,
                  venue_id: venueId
                }
              });
              
            if (notificationError) {
              console.error('Failed to notify venue owner:', notificationError);
            }
          }
        } catch (notifyError) {
          console.error('Error sending notification:', notifyError);
        }
      }

      // Show success toast and redirect
      toast({
        title: "Booking confirmed!",
        description: `You've successfully booked ${venueName} for ${format(data.date, 'PPP')}. Total: SAR ${totalPrice}`,
      });
      
      navigate('/bookings');
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message || "There was a problem creating your booking.",
        variant: "destructive",
      });
      console.error("Booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to get venue owner ID
  const getVenueOwnerId = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('owner_info')
        .eq('id', venueId)
        .single();
        
      if (error || !data?.owner_info) {
        console.error('Error getting venue owner info:', error);
        return null;
      }
      
      const ownerInfo = typeof data.owner_info === 'string' 
        ? JSON.parse(data.owner_info) 
        : data.owner_info;
        
      return ownerInfo?.user_id || null;
    } catch (e) {
      console.error('Error parsing owner info:', e);
      return null;
    }
  };

  // Calculate the price description based on booking type
  const getPriceDescription = () => {
    if (startTime && endTime) {
      const hours = parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]);
      
      switch(bookingType) {
        case 'full-day':
          return `${pricePerPerson} SAR × ${guests} person(s) = ${pricePerPerson * guests} SAR (Full day)`;
        case 'half-day':
          return `${pricePerPerson} SAR × ${guests} person(s) × 50% = ${pricePerPerson * guests * 0.5} SAR (Half day)`;
        case 'hourly':
          return `${pricePerHour} SAR × ${hours} hours = ${pricePerHour * hours} SAR`;
      }
    }
    
    return `${pricePerHour} SAR per hour`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full text-left font-normal flex justify-between items-center ${!field.value && "text-muted-foreground"}`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setSelectedDate(date);
                        // Reset time selections when date changes
                        form.setValue('startTime', '');
                        form.setValue('endTime', '');
                      }}
                      disabled={(date) => {
                        // Disable dates in the past
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        
                        // Disable fully booked dates
                        return isDateFullyBooked(date);
                      }}
                      modifiers={{
                        booked: (date) => hasHourlyBookings(date),
                      }}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Guests</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <Select 
                  onValueChange={handleStartTimeChange}
                  value={field.value}
                  disabled={!selectedDate || isLoading || availableStartTimes.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableStartTimes.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!startTime || availableEndTimes.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableEndTimes.map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Booking Type Info */}
        {startTime && endTime && (
          <div className="bg-findvenue-surface/20 p-3 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Booking Type:</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                bookingType === 'full-day' ? 'bg-findvenue text-white' : 
                bookingType === 'half-day' ? 'bg-findvenue/70 text-white' : 
                'bg-findvenue/40 text-white'
              }`}>
                {bookingType === 'full-day' ? 'Full Day' : 
                 bookingType === 'half-day' ? 'Half Day' : 'Hourly'}
              </span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="your.email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="customerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="specialRequests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requests (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any special requirements for your booking?" 
                  className="min-h-24"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-findvenue-surface/20 p-4 rounded-md">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Price:</span>
            <span className="font-bold text-lg">SAR {totalPrice.toFixed(2)}</span>
          </div>
          <p className="text-sm text-findvenue-text-muted mt-1">
            {getPriceDescription()}
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-findvenue hover:bg-findvenue-dark" 
          disabled={isSubmitting || isLoading || !user}
        >
          {isSubmitting ? (
            <><span className="animate-spin mr-2">◌</span> Processing...</>
          ) : (
            "Confirm Booking"
          )}
        </Button>
        
        <AlertDialog open={showTimeAlert} onOpenChange={setShowTimeAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Time Slot Unavailable</AlertDialogTitle>
              <AlertDialogDescription>
                {timeAlertMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  );
}
