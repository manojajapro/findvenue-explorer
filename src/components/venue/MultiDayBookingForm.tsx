
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, Users, Info } from 'lucide-react';
import { format, isEqual } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);

  useEffect(() => {
    if (venueId) {
      fetchExistingBookings();
    }
  }, [venueId]);

  useEffect(() => {
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
      
      // Update existing bookings
      setExistingBookings(data || []);
      
      // Create array of fully booked dates (dates where all 24 hours are booked)
      const dateBookingMap = new Map();
      
      data?.forEach(booking => {
        const date = booking.booking_date;
        const startHour = parseInt(booking.start_time.split(':')[0]);
        const endHour = parseInt(booking.end_time.split(':')[0]);
        
        if (!dateBookingMap.has(date)) {
          dateBookingMap.set(date, new Set());
        }
        
        for (let hour = startHour; hour < endHour; hour++) {
          dateBookingMap.get(date).add(hour);
        }
      });
      
      // Find dates where all 24 hours are booked
      const fullyBookedDates: Date[] = [];
      
      dateBookingMap.forEach((hours, date) => {
        // If all 24 hours are booked (or enough that no meaningful booking can be made)
        if (hours.size >= 22) { // Considering at least 22 hours booked as fully booked
          fullyBookedDates.push(new Date(date));
        }
      });
      
      setDisabledDates(fullyBookedDates);
      
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    // Generate 24 hour time slots
    for (let i = 0; i <= 23; i++) {
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
      
      return (startTime < bookingEnd && endTime > bookingStart);
    });
  };

  const getAvailableEndTimes = (date: Date, startTime: string) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const availableEndTimes = [];
    
    // Allow up to 24 hour bookings
    for (let i = startHour + 1; i <= 24; i++) {
      const endTime = `${i.toString().padStart(2, '0')}:00`;
      
      if (isTimeSlotAvailable(date, startTime, endTime)) {
        availableEndTimes.push(endTime);
      } else {
        break;
      }
    }
    
    return availableEndTimes;
  };

  const addBookingDay = () => {
    const today = new Date();
    
    // Check if this date is already selected
    const dateAlreadySelected = selectedDays.some(day => 
      isEqual(new Date(day.date).setHours(0,0,0,0), today.setHours(0,0,0,0))
    );
    
    if (!dateAlreadySelected) {
      setSelectedDays([
        ...selectedDays, 
        { date: today, startTime: '10:00', endTime: '12:00', guests: minCapacity }
      ]);
    } else {
      toast({
        title: "Date Already Selected",
        description: "This date is already in your booking.",
        variant: "destructive",
      });
    }
  };

  const removeBookingDay = (index: number) => {
    setSelectedDays(selectedDays.filter((_, i) => i !== index));
  };

  const updateBookingDay = (index: number, field: keyof BookingDay, value: any) => {
    // If updating the date, check if it's already selected in another booking
    if (field === 'date') {
      const dateAlreadySelected = selectedDays.some((day, i) => 
        i !== index && isEqual(new Date(day.date).setHours(0,0,0,0), new Date(value).setHours(0,0,0,0))
      );
      
      if (dateAlreadySelected) {
        toast({
          title: "Date Already Selected",
          description: "This date is already in your booking.",
          variant: "destructive",
        });
        return;
      }
    }
    
    const updatedDays = [...selectedDays];
    updatedDays[index] = { ...updatedDays[index], [field]: value };
    
    if (field === 'date' || field === 'startTime') {
      const availableEndTimes = getAvailableEndTimes(
        updatedDays[index].date, 
        updatedDays[index].startTime
      );
      
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
      for (const day of selectedDays) {
        const bookingDate = format(day.date, 'yyyy-MM-dd');
        
        if (!isTimeSlotAvailable(day.date, day.startTime, day.endTime)) {
          toast({
            title: "Time Slot Unavailable",
            description: `The selected time on ${format(day.date, 'MMMM d, yyyy')} is no longer available.`,
            variant: "destructive",
          });
          continue;
        }
        
        const startHour = parseInt(day.startTime.split(':')[0]);
        const endHour = parseInt(day.endTime.split(':')[0]);
        const hours = endHour - startHour;
        const dayPrice = hours * pricePerHour;
        
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
    <Card className="glass-card border-white/10 w-full mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Day Booking</CardTitle>
        <CardDescription>
          Book this venue for one or multiple days
        </CardDescription>
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
                          {day.startTime} -  {day.endTime}
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
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={day.date}
                                  onSelect={(date) => date && updateBookingDay(index, 'date', date)}
                                  initialFocus
                                  disabled={(date) => {
                                    // Disable past dates
                                    if (date < new Date(new Date().setHours(0,0,0,0))) {
                                      return true;
                                    }
                                    
                                    // Disable dates that are already fully booked
                                    return disabledDates.some(disabledDate => 
                                      isEqual(new Date(disabledDate).setHours(0,0,0,0), date.setHours(0,0,0,0))
                                    );
                                  }}
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
          
          {selectedDays.length === 0 && (
            <Alert className="mt-4 bg-findvenue/10 border-findvenue/20">
              <AlertDescription>
                Click "Add Booking Day" to select one or more days for your booking.
              </AlertDescription>
            </Alert>
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
