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
import { notifyVenueOwnerAboutBooking, sendBookingStatusNotification, getVenueOwnerId as fetchVenueOwnerId } from '@/utils/notificationService';
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
  autoConfirm = false
}: BookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);

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

  const selectedDate = form.watch('date');
  const selectedStartTime = form.watch('startTime');

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

  const disabledDates = fullyBookedDates.map(dateStr => new Date(dateStr));

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
      };

      if (autoConfirm) {
        console.log("[HOURLY_BOOKING] Sending auto-confirm notification for hourly booking");
        try {
          const notified = await sendBookingStatusNotification(bookingWithDetails, 'confirmed');
          
          if (!notified) {
            console.warn('[HOURLY_BOOKING] Booking confirmation notification may not have been sent');
            
            // Attempt direct notification as fallback
            const venueOwnerId = await fetchVenueOwnerId(venueId);
            if (venueOwnerId) {
              console.log("[HOURLY_BOOKING] Found venue owner ID for direct notification:", venueOwnerId);
              
              const { sendNotification } = await import('@/utils/notificationService');
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
      } else {
        console.log("[HOURLY_BOOKING] Sending pending notification to venue owner for hourly booking");
        try {
          const notified = await notifyVenueOwnerAboutBooking(bookingWithDetails);
          
          if (!notified) {
            console.warn('[HOURLY_BOOKING] Venue owner notification may not have been sent, trying direct method');
            
            // Attempt direct notification as fallback
            const venueOwnerId = await fetchVenueOwnerId(venueId);
            if (venueOwnerId) {
              console.log("[HOURLY_BOOKING] Found venue owner ID for direct notification:", venueOwnerId);
              
              const { sendNotification } = await import('@/utils/notificationService');
              await sendNotification(
                venueOwnerId,
                'New Booking Request',
                `A new booking request for "${venueName}" on ${formattedDate} has been received.`,
                'booking',
                '/customer-bookings',
                {
                  booking_id: bookingWithDetails.id,
                  venue_id: venueId,
                  status: 'pending',
                  booking_date: formattedDate,
                  venue_name: venueName,
                  booking_type: 'hourly'
                }
              );
              
              console.log('[HOURLY_BOOKING] Fallback notification sent to venue owner');
            } else {
              console.error('[HOURLY_BOOKING] Could not find venue owner ID for fallback notification');
            }
          } else {
            console.log('[HOURLY_BOOKING] Venue owner notification sent successfully');
          }
        } catch (notifyError) {
          console.error("[HOURLY_BOOKING] Error notifying venue owner:", notifyError);
        }
        
        toast({
          title: "Booking requested!",
          description: `You've successfully requested ${venueName} on ${format(data.date, 'PPP')} from ${data.startTime} to ${data.endTime}. Total: SAR ${totalPrice}`,
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
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        return disabledDates.some(
                          disabledDate =>
                            format(disabledDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        );
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
