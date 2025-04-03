
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, Users, Info } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MultiDayBookingFormProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  minCapacity?: number;
  maxCapacity?: number;
}

type BookingDay = {
  date: Date;
  startTime: string;
  endTime: string;
  guests: number;
};

export default function MultiDayBookingForm({
  venueId,
  venueName,
  pricePerHour = 0,
  minCapacity = 1,
  maxCapacity = 100
}: MultiDayBookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<BookingDay[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Record<string, string[]>>({});
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (venueId) {
      fetchExistingBookings();
    }
  }, [venueId]);

  useEffect(() => {
    // Calculate total price based on hours and days
    let newTotal = 0;
    selectedDays.forEach(day => {
      const startHour = parseInt(day.startTime.split(':')[0]);
      const endHour = parseInt(day.endTime.split(':')[0]);
      const hours = endHour - startHour;
      newTotal += hours * pricePerHour;
    });
    setTotalPrice(newTotal);
  }, [selectedDays, pricePerHour]);

  const fetchExistingBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId)
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 9; i <= 21; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const isTimeSlotAvailable = (date: Date, startTime: string, endTime: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return !existingBookings.some(booking => {
      if (booking.booking_date !== dateStr) return false;
      
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      
      // Check if the time slots overlap
      return (startTime < bookingEnd && endTime > bookingStart);
    });
  };

  const getAvailableEndTimes = (date: Date, startTime: string) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const availableEndTimes = [];
    
    // Generate all possible end times after the start time
    for (let i = startHour + 1; i <= 22; i++) {
      const endTime = `${i.toString().padStart(2, '0')}:00`;
      
      // Check if this entire block (from start to end) is available
      if (isTimeSlotAvailable(date, startTime, endTime)) {
        availableEndTimes.push(endTime);
      } else {
        break; // Stop at the first unavailable slot
      }
    }
    
    return availableEndTimes;
  };

  const addBookingDay = () => {
    const today = new Date();
    setSelectedDays([
      ...selectedDays, 
      { date: today, startTime: '10:00', endTime: '12:00', guests: minCapacity }
    ]);
  };

  const removeBookingDay = (index: number) => {
    setSelectedDays(selectedDays.filter((_, i) => i !== index));
  };

  const updateBookingDay = (index: number, field: keyof BookingDay, value: any) => {
    const updatedDays = [...selectedDays];
    updatedDays[index] = { ...updatedDays[index], [field]: value };
    
    // If date or start time changes, we need to validate end time
    if (field === 'date' || field === 'startTime') {
      const availableEndTimes = getAvailableEndTimes(
        updatedDays[index].date, 
        updatedDays[index].startTime
      );
      
      // If current end time is not available, set to the first available
      if (availableEndTimes.length > 0 && !availableEndTimes.includes(updatedDays[index].endTime)) {
        updatedDays[index].endTime = availableEndTimes[0];
      }
    }
    
    setSelectedDays(updatedDays);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book this venue",
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        title: "No Dates Selected",
        description: "Please select at least one date to book",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Process each selected day as a separate booking
      for (const day of selectedDays) {
        const bookingDate = format(day.date, 'yyyy-MM-dd');
        
        // Verify availability once more before booking
        if (!isTimeSlotAvailable(day.date, day.startTime, day.endTime)) {
          toast({
            title: "Time Slot Unavailable",
            description: `The selected time on ${format(day.date, 'MMMM d, yyyy')} is no longer available.`,
            variant: "destructive",
          });
          continue; // Skip this day and try the next
        }
        
        // Calculate hours for this booking
        const startHour = parseInt(day.startTime.split(':')[0]);
        const endHour = parseInt(day.endTime.split(':')[0]);
        const hours = endHour - startHour;
        const dayPrice = hours * pricePerHour;
        
        // Create booking
        const { error } = await supabase.from('bookings').insert({
          user_id: user.id,
          venue_id: venueId,
          venue_name: venueName,
          booking_date: bookingDate,
          start_time: day.startTime,
          end_time: day.endTime,
          status: 'pending',
          total_price: dayPrice,
          guests: day.guests,
          special_requests: specialRequests
        });

        if (error) throw error;
      }

      toast({
        title: "Booking Submitted",
        description: `You have successfully requested ${selectedDays.length} booking${selectedDays.length > 1 ? 's' : ''}.`,
      });

      // Reset form
      setSelectedDays([]);
      setSpecialRequests('');
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to submit booking request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = generateTimeSlots();

  return (
    <Card className="glass-card border-white/10 w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Book Multiple Days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {selectedDays.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-findvenue-text-muted mb-4">No booking days selected yet</p>
              <Button onClick={addBookingDay}>Add Booking Day</Button>
            </div>
          ) : (
            <>
              <Accordion type="multiple" className="w-full">
                {selectedDays.map((day, index) => (
                  <AccordionItem key={index} value={`day-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 pl-1">
                        <span>Day {index + 1}:</span>
                        <span className="text-findvenue">{format(day.date, 'MMMM d, yyyy')}</span>
                        <span className="text-findvenue-text-muted">
                          {day.startTime} - {day.endTime}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 p-2">
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label>Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(day.date, 'MMMM d, yyyy')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={day.date}
                                  onSelect={(date) => date && updateBookingDay(index, 'date', date)}
                                  initialFocus
                                  disabled={(date) => date < new Date()}
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label>Start Time</Label>
                              <Select
                                value={day.startTime}
                                onValueChange={(value) => updateBookingDay(index, 'startTime', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select start time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeSlots.slice(0, -1).map((time) => (
                                    <SelectItem 
                                      key={time} 
                                      value={time}
                                      disabled={!isTimeSlotAvailable(day.date, time, time.replace(/^\d+/, hour => `${parseInt(hour) + 1}`))}
                                    >
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2">
                              <Label>End Time</Label>
                              <Select
                                value={day.endTime}
                                onValueChange={(value) => updateBookingDay(index, 'endTime', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select end time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableEndTimes(day.date, day.startTime).map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label>Number of Guests</Label>
                            <Input
                              type="number"
                              min={minCapacity}
                              max={maxCapacity}
                              value={day.guests}
                              onChange={(e) => updateBookingDay(index, 'guests', parseInt(e.target.value) || minCapacity)}
                              className="bg-background"
                            />
                          </div>

                          <Button 
                            variant="destructive" 
                            onClick={() => removeBookingDay(index)}
                          >
                            Remove This Day
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="flex justify-center">
                <Button onClick={addBookingDay} variant="outline" className="mt-4">
                  Add Another Day
                </Button>
              </div>
            </>
          )}

          {selectedDays.length > 0 && (
            <>
              <div className="grid gap-2 mt-6">
                <Label>Special Requests (Optional)</Label>
                <Textarea
                  placeholder="Any special requirements or notes for the venue owner..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="bg-background min-h-24"
                />
              </div>

              <div className="bg-findvenue/10 p-4 rounded-md mt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-findvenue mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">Booking Summary</h4>
                    <ul className="space-y-1 text-sm text-findvenue-text-muted">
                      <li>• {selectedDays.length} day(s) selected</li>
                      <li>• {pricePerHour} SAR per hour</li>
                      <li className="font-medium text-findvenue">
                        Total: {totalPrice} SAR
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          className="w-full bg-findvenue hover:bg-findvenue-dark"
          disabled={isSubmitting || selectedDays.length === 0}
        >
          {isSubmitting ? 'Submitting...' : 'Request Booking'}
        </Button>
      </CardFooter>
    </Card>
  );
}
