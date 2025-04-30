
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
import { isDateBlockedForVenue } from '@/utils/dateUtils';
import { notifyVenueOwnerAboutBooking, sendBookingStatusNotification, sendNotification, getVenueOwnerId } from '@/utils/notificationService';
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
  blockedDates?: string[];
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
  autoConfirm = false,
  blockedDates = []
}: MultiDayBookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricePerPerson, setPricePerPerson] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [venueBlockedDates, setVenueBlockedDates] = useState<string[]>(blockedDates);
  
  useEffect(() => {
    // Fetch blocked dates if not provided
    if (blockedDates.length === 0) {
      const fetchBlockedDates = async () => {
        try {
          const { data, error } = await supabase
            .from('blocked_dates')
            .select('date')
            .eq('venue_id', venueId);
            
          if (error) throw error;
          
          const blockedDateStrings = (data || []).map(item => item.date);
          setVenueBlockedDates(blockedDateStrings);
        } catch (err) {
          console.error('Error fetching blocked dates:', err);
        }
      };
      
      fetchBlockedDates();
      
      const channel = supabase
        .channel('blocked_dates_changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'blocked_dates',
          filter: `venue_id=eq.${venueId}`
        }, () => {
          fetchBlockedDates();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setVenueBlockedDates(blockedDates);
    }
  }, [venueId, blockedDates]);
  
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
  const selectedDate = form.watch('date');
  
  useEffect(() => {
    if (pricePerPerson > 0) {
      setTotalPrice(pricePerPerson * guestsCount);
    } else {
      setTotalPrice(basePrice);
    }
  }, [guestsCount, pricePerPerson, basePrice]);

  // Combine booked and blocked dates for the calendar
  const disabledDates = [
    ...bookedDates.map(dateStr => new Date(dateStr)),
    ...venueBlockedDates.map(dateStr => new Date(dateStr))
  ];

  // Check if the selected date is blocked
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      if (venueBlockedDates.includes(dateStr)) {
        toast({
          title: "Date not available",
          description: "This date has been blocked by the venue owner and is not available for booking.",
          variant: "destructive"
        });
        form.setValue('date', undefined as any);
      }
    }
  }, [selectedDate, venueBlockedDates, toast, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to book this venue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Double-check that the date is not blocked
      const isBlocked = await isDateBlockedForVenue(venueId, data.date);
      if (isBlocked) {
        toast({
          title: "Date not available",
          description: "This date has been blocked by the venue owner and is not available for booking.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const initialStatus = autoConfirm ? 'confirmed' : 'pending';
      const formattedDate = format(data.date, 'yyyy-MM-dd');
      
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

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if date is blocked by owner
    if (venueBlockedDates.includes(dateStr)) return true;
    
    // Check if date is already booked
    return bookedDates.some(
      bookedDate => format(new Date(bookedDate), 'yyyy-MM-dd') === dateStr
    );
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
                      onSelect={field.onChange}
                      disabled={isDateDisabled}
                      modifiers={{
                        booked: disabledDates,
                        blocked: venueBlockedDates.map(dateStr => new Date(dateStr)),
                      }}
                      modifiersStyles={{
                        booked: { backgroundColor: '#FEE2E2', textDecoration: 'line-through', color: '#B91C1C' },
                        blocked: { backgroundColor: '#F3F4F6', textDecoration: 'line-through', color: '#6B7280' },
                      }}
                      className="p-3 pointer-events-auto"
                    />
                    <div className="p-3 border-t border-border">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 bg-[#FEE2E2] rounded-full"></span>
                          <span className="text-xs">Already booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 bg-[#F3F4F6] rounded-full"></span>
                          <span className="text-xs">Blocked by owner</span>
                        </div>
                      </div>
                    </div>
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
