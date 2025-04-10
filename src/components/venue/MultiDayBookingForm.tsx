
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
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate';
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
}: MultiDayBookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricePerPerson, setPricePerPerson] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const { notifyVenueOwner } = useBookingStatusUpdate(() => Promise.resolve());
  
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
  
  useEffect(() => {
    if (pricePerPerson > 0) {
      setTotalPrice(pricePerPerson * guestsCount);
    } else {
      setTotalPrice(basePrice);
    }
  }, [guestsCount, pricePerPerson, basePrice]);

  const disabledDates = bookedDates.map(dateStr => new Date(dateStr));

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
      // Create a booking record with additional data for proper notifications
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            venue_id: venueId,
            venue_name: venueName,
            booking_date: format(data.date, 'yyyy-MM-dd'),
            start_time: '00:00', // Full day booking indicator
            end_time: '23:59',   // Full day booking indicator
            status: 'pending',
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
      
      if (!bookingData || bookingData.length === 0) {
        throw new Error("Failed to create booking record");
      }
      
      console.log("Full day booking created:", bookingData[0]);

      // Enhanced booking object to ensure proper notification
      const bookingWithDetails = {
        ...bookingData[0],
        venue_name: venueName,
        booking_date: format(data.date, 'yyyy-MM-dd'),
      };

      // Send notification to venue owner about the new full-day booking
      const notified = await notifyVenueOwner(bookingWithDetails);
      
      if (!notified) {
        console.warn('Venue owner notification may not have been sent');
      }

      toast({
        title: "Full-day booking requested!",
        description: `You've successfully requested ${venueName} for ${format(data.date, 'PPP')}. Total: SAR ${totalPrice}`,
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
                      modifiers={{
                        booked: disabledDates,
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
