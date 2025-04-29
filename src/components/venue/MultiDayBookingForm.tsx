import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notifyVenueOwnerAboutBooking, sendBookingStatusNotification, sendNotification, getVenueOwnerId } from '@/utils/notificationService';
import BookingCalendar from './BookingCalendar';
import { isDateBlockedForVenue } from '@/utils/venueOwnerUtils';
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

interface MultiDayBookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  minCapacity?: number;
  maxCapacity?: number;
  bookedDates: string[];
  isLoading: boolean;
  autoConfirm?: boolean;
}

const formSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  guests: z.number().min(1, "At least one guest is required"),
  specialRequests: z.string().optional(),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(5, "Please enter a valid phone number"),
  paymentMethod: z.string().min(1, "Please select a payment method"),
});

export default function MultiDayBookingForm({
  venueId,
  venueName,
  pricePerHour = 0,
  minCapacity = 1,
  maxCapacity = 100,
  bookedDates,
  isLoading,
  autoConfirm = false
}: MultiDayBookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricePerPerson, setPricePerPerson] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchVenuePricing = async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('price_per_person, starting_price')
          .eq('id', venueId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          if (data.price_per_person) {
            setPricePerPerson(Number(data.price_per_person) || 0);
          }
          
          if (data.starting_price) {
            setBasePrice(Number(data.starting_price) || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching venue pricing:', error);
        setBasePrice(Math.round(pricePerHour * 13 * 0.85));
      }
    };
    
    fetchVenuePricing();
  }, [venueId, pricePerHour]);

  useEffect(() => {
    // Fetch blocked dates from the blocked_dates table
    const fetchBlockedDates = async () => {
      try {
        const { data, error } = await supabase
          .from('blocked_dates')
          .select('date')
          .eq('venue_id', venueId);
          
        if (error) {
          console.error('Error fetching blocked dates:', error);
          return;
        }
        
        // Extract the dates and format them
        const blocked = data?.map(item => format(new Date(item.date), 'yyyy-MM-dd')) || [];
        console.log("Blocked dates found in MultiDayBookingForm:", blocked);
        setBlockedDates(blocked);
        
        // If the form date is already set and it's blocked, we need to reset it
        const selectedDate = form.getValues('date');
        if (selectedDate && blocked.includes(format(selectedDate, 'yyyy-MM-dd'))) {
          form.setValue('date', undefined as any);
          toast({
            title: "Date unavailable",
            description: "The date you selected is not available as it has been blocked by the venue owner.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Error processing blocked dates:', err);
      }
    };
    
    fetchBlockedDates();
  }, [venueId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guests: minCapacity,
      specialRequests: "",
      customerEmail: user?.email ?? "",
      customerPhone: "",
      paymentMethod: "Cash",
    },
  });

  const guestsCount = form.watch('guests');
  
  useEffect(() => {
    if (pricePerPerson > 0) {
      setTotalPrice(pricePerPerson * guestsCount);
    } else {
      setTotalPrice(basePrice);
    }
  }, [guestsCount, pricePerPerson, basePrice]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to book this venue.",
        variant: "destructive",
      });
      return;
    }

    // Check if the date is blocked - Multiple checks for reliability
    const formattedDate = format(data.date, 'yyyy-MM-dd');
    
    // Check local state first
    if (blockedDates.includes(formattedDate)) {
      toast({
        title: "Date unavailable",
        description: "This date is not available for booking as it has been blocked by the venue owner.",
        variant: "destructive",
      });
      return;
    }
    
    // Double check with backend
    try {
      const isBlocked = await isDateBlockedForVenue(venueId, formattedDate);
      
      if (isBlocked) {
        toast({
          title: "Date unavailable",
          description: "This date is not available for booking as it has been blocked by the venue owner.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('Error checking if date is blocked:', error);
      toast({
        title: "Error",
        description: "There was a problem checking date availability. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const initialStatus = autoConfirm ? 'confirmed' : 'pending';
      
      // One last check for blocked dates before creating the booking
      const { data: finalBlockCheck } = await supabase
        .from('blocked_dates')
        .select('id')
        .eq('venue_id', venueId)
        .eq('date', formattedDate)
        .maybeSingle();
        
      if (finalBlockCheck) {
        toast({
          title: "Date unavailable",
          description: "This date has been blocked by the venue owner and is not available.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log("[FULL_DAY_BOOKING] Creating full day booking with status:", initialStatus, "for venue ID:", venueId);
      
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            venue_id: venueId,
            venue_name: venueName,
            booking_date: formattedDate,
            start_time: '00:00',
            end_time: '23:59',
            status: initialStatus,
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
        console.error("[FULL_DAY_BOOKING] Error creating booking:", error);
        throw error;
      }
      
      if (!bookingData || bookingData.length === 0) {
        throw new Error("Failed to create booking record");
      }
      
      console.log("[FULL_DAY_BOOKING] Full day booking created:", bookingData[0]);

      // Ensure we have consistent booking data format for notifications
      const bookingWithDetails = {
        ...bookingData[0],
        venue_name: venueName,
        booking_date: formattedDate,
        booking_type: 'full-day'
      };

      try {
        // Use sendBookingStatusNotification to ensure status is included properly
        if (autoConfirm) {
          console.log("[FULL_DAY_BOOKING] Sending auto-confirm notification for full day booking");
          await sendBookingStatusNotification(bookingWithDetails, 'confirmed');
        } else {
          // For pending bookings, use the status in the notification
          console.log("[FULL_DAY_BOOKING] Sending booking request notification for pending booking");
          await sendBookingStatusNotification(bookingWithDetails, 'pending');
        }
      } catch (notifyError) {
        console.error("[FULL_DAY_BOOKING] Error sending booking notifications, trying alternative method:", notifyError);
        
        // Fallback notification method
        try {
          const ownerId = await getVenueOwnerId(venueId);
          if (ownerId) {
            const status = autoConfirm ? 'confirmed' : 'pending';
            const title = autoConfirm ? 'Booking Confirmed' : 'New Booking Request';
            const message = autoConfirm
              ? `A booking for "${venueName}" on ${format(data.date, 'PPP')} has been confirmed.`
              : `A new booking request for "${venueName}" on ${format(data.date, 'PPP')} requires your attention.`;
              
            await sendNotification(
              ownerId,
              title,
              message,
              'booking',
              '/customer-bookings',
              {
                booking_id: bookingWithDetails.id,
                venue_id: venueId,
                status: status,
                booking_date: formattedDate,
                venue_name: venueName,
                booking_type: 'full-day'
              }
            );
          }
        } catch (fallbackError) {
          console.error("[FULL_DAY_BOOKING] Fallback notification also failed:", fallbackError);
        }
      }

      if (autoConfirm) {
        toast({
          title: "Full-day booking confirmed!",
          description: `Your booking for ${venueName} on ${format(data.date, 'PPP')} has been automatically confirmed. Total: SAR ${totalPrice}`,
        });
      } else {
        toast({
          title: "Full-day booking requested!",
          description: `You've successfully requested ${venueName} for ${format(data.date, 'PPP')}. Total: SAR ${totalPrice}`,
        });
      }

      navigate('/bookings');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "There was a problem creating your booking.";
      toast({
        title: "Booking failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
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
                <BookingCalendar
                  selectedDate={field.value}
                  onDateSelect={(date) => {
                    // Only set the date if it's not blocked
                    if (date && !blockedDates.includes(format(date, 'yyyy-MM-dd'))) {
                      field.onChange(date);
                    } else if (!date) {
                      field.onChange(undefined);
                    }
                  }}
                  bookedDates={bookedDates}
                  fullyBookedDates={bookedDates}
                  dayBookedDates={bookedDates}
                  hourlyBookedDates={[]}
                  bookingType="full-day"
                  venueId={venueId}
                />
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
                      min={minCapacity}
                      max={maxCapacity}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  This venue allows {minCapacity} to {maxCapacity} guests
                </p>
              </FormItem>
            )}
          />
        </div>
        
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
            <div>
              <span className="font-medium">Total Price:</span>
              <p className="text-xs text-findvenue-text-muted mt-1">
                {pricePerPerson > 0 
                  ? `${pricePerPerson} SAR × ${guestsCount} guests`
                  : 'Full day rate includes the entire venue from 00:00 to 23:59'
                }
              </p>
            </div>
            <span className="font-bold text-lg">SAR {totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-findvenue hover:bg-findvenue-dark" 
          disabled={isSubmitting || isLoading || !user}
        >
          {isSubmitting ? (
            <><span className="animate-spin mr-2">◌</span> Processing...</>
          ) : (
            "Book Full Day"
          )}
        </Button>
      </form>
    </Form>
  );
}
