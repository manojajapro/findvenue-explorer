
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  notifyVenueOwnerAboutBooking, 
  sendBookingStatusNotification, 
  getVenueOwnerId, 
  sendNotification 
} from '@/utils/notificationService';
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
import { isDateBlockedForVenue } from '@/utils/dateUtils';

interface BookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  ownerId: string;
  ownerName: string;
  isLoading: boolean;
  bookedTimeSlots: Record<string, string[]>;
  fullyBookedDates: string[];
  availableTimeSlots: string[];
  autoConfirm?: boolean;
  blockedDates?: string[];
}

const formSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string({
    required_error: "Please select a start time",
  }),
  endTime: z.string({
    required_error: "Please select an end time",
  }),
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
  isLoading,
  bookedTimeSlots,
  fullyBookedDates,
  availableTimeSlots,
  autoConfirm = false,
  blockedDates = []
}: BookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [venueBlockedDates, setVenueBlockedDates] = useState<string[]>(blockedDates);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      startTime: availableTimeSlots[0] || '',
      endTime: availableTimeSlots[1] || '',
      guests: 1,
      specialRequests: "",
      customerEmail: user?.email ?? "",
      customerPhone: "",
      paymentMethod: "Cash",
    },
  });

  // Fetch blocked dates if not provided
  useEffect(() => {
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

  const selectedDate = form.watch('date');
  const selectedStartTime = form.watch('startTime');

  // Check if selected date is blocked
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

  const updateAvailableEndTimes = (startTime: string) => {
    const startIndex = availableTimeSlots.indexOf(startTime);
    if (startIndex !== -1) {
      setAvailableEndTimes(availableTimeSlots.slice(startIndex + 1));
    } else {
      setAvailableEndTimes([]);
    }
  };

  useEffect(() => {
    if (selectedStartTime) {
      updateAvailableEndTimes(selectedStartTime);
    }
  }, [selectedStartTime, availableTimeSlots]);

  // Combine booked and blocked dates for the calendar
  const disabledDates = [
    ...fullyBookedDates.map(dateStr => new Date(dateStr)),
    ...venueBlockedDates.map(dateStr => new Date(dateStr))
  ];

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
      // Double-check if the date is blocked
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

      const startHour = parseInt(data.startTime.split(':')[0]);
      const endHour = parseInt(data.endTime.split(':')[0]);
      const hours = endHour - startHour;
      const totalPrice = hours * pricePerHour;
      
      const initialStatus = autoConfirm ? 'confirmed' : 'pending';
      const formattedDate = format(data.date, 'yyyy-MM-dd');
      
      console.log("[HOURLY_BOOKING] Creating hourly booking with status:", initialStatus, "for venue ID:", venueId);
      
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            venue_id: venueId,
            venue_name: venueName,
            booking_date: formattedDate,
            start_time: data.startTime,
            end_time: data.endTime,
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

      if (error) throw error;
      
      if (!bookingData || bookingData.length === 0) {
        throw new Error("Failed to create booking record");
      }
      
      console.log("[HOURLY_BOOKING] Hourly booking created:", bookingData[0]);
      
      const bookingWithDetails = {
        ...bookingData[0],
        venue_name: venueName,
        booking_date: formattedDate,
        booking_type: 'hourly',
        owner_id: ownerId
      };

      if (!autoConfirm) {
        console.log("[HOURLY_BOOKING] Sending pending notification to venue owner");
        
        notifyVenueOwnerAboutBooking(bookingWithDetails)
          .then(success => {
            if (success) {
              console.log("[HOURLY_BOOKING] Successfully notified venue owner about new booking");
            } else {
              console.error("[HOURLY_BOOKING] Failed to notify venue owner about new booking");
            }
          })
          .catch(error => {
            console.error("[HOURLY_BOOKING] Error notifying venue owner:", error);
          });
        
        toast({
          title: "Booking requested!",
          description: `You've successfully requested ${venueName} on ${format(data.date, 'PPP')} from ${data.startTime} to ${data.endTime}. Total: SAR ${totalPrice}`,
        });
      } else {
        console.log("[HOURLY_BOOKING] Sending auto-confirm notification for hourly booking");
        try {
          const notified = await sendBookingStatusNotification(bookingWithDetails, 'confirmed');
          
          if (!notified) {
            console.warn('[HOURLY_BOOKING] Booking confirmation notification may not have been sent');
            
            // Attempt direct notification as fallback
            const venueOwnerId = await getVenueOwnerId(venueId);
            if (venueOwnerId) {
              console.log("[HOURLY_BOOKING] Found venue owner ID for direct notification:", venueOwnerId);
              
              await sendNotification(
                venueOwnerId,
                'Booking Confirmed',
                `A booking for "${venueName}" on ${formattedDate} has been automatically confirmed.`,
                'booking',
                '/customer-bookings',
                {
                  booking_id: bookingWithDetails.id,
                  venue_id: venueId,
                  status: 'confirmed',
                  booking_date: formattedDate,
                  venue_name: venueName,
                  booking_type: 'hourly'
                }
              );
              
              console.log('[HOURLY_BOOKING] Fallback notification sent to venue owner');
            }
          } else {
            console.log('[HOURLY_BOOKING] Booking confirmation notification sent successfully');
          }
        } catch (notifyError) {
          console.error("[HOURLY_BOOKING] Error sending booking notifications:", notifyError);
        }
        
        toast({
          title: "Booking confirmed!",
          description: `Your booking for ${venueName} on ${format(data.date, 'PPP')} from ${data.startTime} to ${data.endTime} has been automatically confirmed. Total: SAR ${totalPrice}`,
        });
      }
      
      navigate('/bookings');
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message || "There was a problem creating your booking.",
        variant: "destructive",
      });
      console.error("[HOURLY_BOOKING] Booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTimeSlotBooked = (date: Date, timeSlot: string): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookedTimeSlots[dateStr]?.includes(timeSlot) || false;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if date is blocked by owner
    if (venueBlockedDates.includes(dateStr)) return true;
    
    // Check if date is fully booked
    return disabledDates.some(
      disabledDate => format(disabledDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
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
                        booked: fullyBookedDates.map(dateStr => new Date(dateStr)),
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
                          <span className="text-xs">Fully booked</span>
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
                      min="1"
                      max="100"
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimeSlots.map((time, index) => (
                      <SelectItem key={index} value={time} disabled={isTimeSlotBooked(selectedDate, time)}>
                        {time}
                      </SelectItem>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableEndTimes.map((time, index) => {
                      const startTime = form.getValues('startTime');
                      const endTime = time;
                      const timeSlot = `${startTime} - ${endTime}`;
                      return (
                        <SelectItem key={index} value={time} disabled={isTimeSlotBooked(selectedDate, timeSlot)}>
                          {time}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <Button
          type="submit"
          className="w-full bg-findvenue hover:bg-findvenue-dark"
          disabled={isSubmitting || isLoading || !user}
        >
          {isSubmitting ? (
            <><span className="animate-spin mr-2">◌</span> Processing...</>
          ) : (
            "Book Venue"
          )}
        </Button>
      </form>
    </Form>
  );
}
