import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { format, addDays, eachDayOfInterval, isBefore, addHours } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, Users, Info, X, Check } from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { isDateBooked, isTimeSlotAvailable, generateTimeSlots } from '@/lib/utils';
import { toast } from 'sonner';

interface RangeBookingFormProps {
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

const RangeBookingForm = ({
  venueId,
  venueName,
  pricePerHour = 0,
  minCapacity = 1,
  maxCapacity = 100
}: RangeBookingFormProps) => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState('date-range');
  const [bookingDays, setBookingDays] = useState<BookingDay[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [guests, setGuests] = useState(minCapacity);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const timeSlots = generateTimeSlots();
  
  useEffect(() => {
    if (venueId) {
      fetchExistingBookings();
    }
  }, [venueId]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const dates = eachDayOfInterval({
        start: dateRange.from,
        end: dateRange.to
      });
      
      setSelectedDates(dates);
      
      const newBookingDays = dates
        .filter(date => !isDateBooked(date, existingBookings))
        .map(date => ({
          date,
          startTime,
          endTime,
          guests
        }));
      
      setBookingDays(newBookingDays);
    }
  }, [dateRange, existingBookings, startTime, endTime, guests]);

  useEffect(() => {
    let newTotal = 0;
    bookingDays.forEach(day => {
      const startHour = parseInt(day.startTime.split(':')[0]);
      const endHour = parseInt(day.endTime.split(':')[0]);
      const hours = endHour - startHour;
      newTotal += hours * pricePerHour;
    });
    setTotalPrice(newTotal);
  }, [bookingDays, pricePerHour]);

  useEffect(() => {
    const dates: Date[] = [];
    existingBookings.forEach(booking => {
      if (booking.status !== 'cancelled') {
        const bookingDate = new Date(booking.booking_date);
        if (!dates.some(date => isBefore(date, bookingDate) && isBefore(bookingDate, date))) {
          dates.push(bookingDate);
        }
      }
    });
    setBookedDates(dates);
  }, [existingBookings]);

  const fetchExistingBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId);

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
      toast.error('Could not fetch venue availability');
    }
  };

  const isTimeSlotAvailableForAll = (startTime: string, endTime: string) => {
    return bookingDays.every(day => 
      isTimeSlotAvailable(day.date, startTime, endTime, existingBookings)
    );
  };

  const updateAllBookingTimes = (startTime: string, endTime: string) => {
    if (isTimeSlotAvailableForAll(startTime, endTime)) {
      setStartTime(startTime);
      setEndTime(endTime);
      
      setBookingDays(bookingDays.map(day => ({
        ...day,
        startTime,
        endTime
      })));
    } else {
      toast.error('Selected time slot is not available for all dates');
    }
  };

  const updateAllBookingGuests = (guests: number) => {
    setGuests(guests);
    
    setBookingDays(bookingDays.map(day => ({
      ...day,
      guests
    })));
  };

  const handleAddCustomDate = () => {
    const today = new Date();
    
    if (bookingDays.some(day => format(day.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))) {
      toast.error('This date is already added to your booking');
      return;
    }
    
    if (isDateBooked(today, existingBookings)) {
      toast.error('This date is already booked');
      return;
    }
    
    const newDay = {
      date: today,
      startTime,
      endTime,
      guests
    };
    
    setBookingDays([...bookingDays, newDay]);
    setActiveTab('custom-dates');
  };

  const removeBookingDay = (index: number) => {
    const updatedDays = [...bookingDays];
    updatedDays.splice(index, 1);
    setBookingDays(updatedDays);
  };

  const updateBookingDay = (index: number, field: keyof BookingDay, value: any) => {
    const updatedDays = [...bookingDays];
    
    if (field === 'date' && isDateBooked(value, existingBookings)) {
      toast.error('This date is already booked');
      return;
    }
    
    if ((field === 'startTime' || field === 'endTime')) {
      const day = updatedDays[index];
      const newStartTime = field === 'startTime' ? value : day.startTime;
      const newEndTime = field === 'endTime' ? value : day.endTime;
      
      if (!isTimeSlotAvailable(day.date, newStartTime, newEndTime, existingBookings)) {
        toast.error('Selected time slot is not available');
        return;
      }
    }
    
    updatedDays[index] = { ...updatedDays[index], [field]: value };
    setBookingDays(updatedDays);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login to book this venue');
      return;
    }

    if (bookingDays.length === 0) {
      toast.error('Please select at least one date to book');
      return;
    }

    setIsSubmitting(true);

    try {
      for (const day of bookingDays) {
        const startHour = parseInt(day.startTime.split(':')[0]);
        const endHour = parseInt(day.endTime.split(':')[0]);
        const hours = endHour - startHour;
        const dayPrice = hours * pricePerHour;
        
        if (!isTimeSlotAvailable(day.date, day.startTime, day.endTime, existingBookings)) {
          toast.error(`The selected time on ${format(day.date, 'MMMM d, yyyy')} is no longer available.`);
          continue;
        }
        
        const { error } = await supabase.from('bookings').insert({
          user_id: user.id,
          venue_id: venueId,
          venue_name: venueName,
          booking_date: format(day.date, 'yyyy-MM-dd'),
          start_time: day.startTime,
          end_time: day.endTime,
          status: 'pending',
          total_price: dayPrice,
          guests: day.guests,
          special_requests: specialRequests
        });

        if (error) throw error;
      }

      toast.success(`You have successfully requested ${bookingDays.length} booking${bookingDays.length > 1 ? 's' : ''}.`);

      setDateRange(undefined);
      setBookingDays([]);
      setSpecialRequests('');
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast.error('Failed to submit booking request: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-card border-white/10 w-full mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Date Range Booking</CardTitle>
        <CardDescription>
          Book this venue for a specific date range or multiple individual days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="date-range" className="flex-1">Date Range</TabsTrigger>
            <TabsTrigger value="custom-dates" className="flex-1">Custom Dates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="date-range" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">Select Date Range</Label>
                <div className="rounded-md border border-white/10 p-1">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={(date) => {
                      return isBefore(date, new Date()) || 
                        bookedDates.some(bookedDate => 
                          format(bookedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        );
                    }}
                    numberOfMonths={1}
                    className="rounded-md"
                  />
                </div>
                
                {dateRange?.from && dateRange?.to && (
                  <div className="mt-2 text-sm text-findvenue">
                    <p className="font-medium">
                      {format(dateRange.from, 'MMMM d, yyyy')} — {format(dateRange.to, 'MMMM d, yyyy')}
                    </p>
                    <p className="text-findvenue-text-muted mt-1">
                      {bookingDays.length} available day(s) selected
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Time for All Days</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Start Time</Label>
                      <Select
                        value={startTime}
                        onValueChange={(value) => {
                          const startHour = parseInt(value.split(':')[0]);
                          const endHour = parseInt(endTime.split(':')[0]);
                          
                          if (startHour >= endHour) {
                            const newEndTime = `${Math.min(startHour + 2, 21).toString().padStart(2, '0')}:00`;
                            updateAllBookingTimes(value, newEndTime);
                          } else {
                            updateAllBookingTimes(value, endTime);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.slice(0, -1).map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">End Time</Label>
                      <Select
                        value={endTime}
                        onValueChange={(value) => {
                          const startHour = parseInt(startTime.split(':')[0]);
                          const endHour = parseInt(value.split(':')[0]);
                          
                          if (endHour <= startHour) {
                            toast.error("End time must be after start time");
                            return;
                          }
                          
                          updateAllBookingTimes(startTime, value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.slice(1).map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">Guests for All Days</Label>
                  <Input
                    type="number"
                    min={minCapacity}
                    max={maxCapacity}
                    value={guests}
                    onChange={(e) => updateAllBookingGuests(parseInt(e.target.value) || minCapacity)}
                    className="bg-background"
                  />
                  <p className="text-xs text-findvenue-text-muted mt-1">
                    Capacity: {minCapacity} - {maxCapacity} guests
                  </p>
                </div>
                
                <div className="pt-2">
                  <Label className="mb-2 block">Summary</Label>
                  {bookingDays.length === 0 ? (
                    <div className="text-findvenue-text-muted text-sm p-2 border border-dashed border-white/10 rounded-md text-center">
                      No dates selected or all selected dates are booked
                    </div>
                  ) : (
                    <div className="border border-white/10 rounded-md divide-y divide-white/10">
                      {bookingDays.slice(0, 3).map((day, index) => (
                        <div key={index} className="p-2 flex items-center justify-between text-sm">
                          <div>{format(day.date, 'MMM d, yyyy')}</div>
                          <div className="text-findvenue-text-muted">{day.startTime} - {day.endTime}</div>
                        </div>
                      ))}
                      {bookingDays.length > 3 && (
                        <div className="p-2 text-center text-xs text-findvenue-text-muted">
                          +{bookingDays.length - 3} more days
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="custom-dates" className="space-y-6">
            {bookingDays.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-findvenue-text-muted mb-4">No booking days selected yet</p>
                <Button onClick={handleAddCustomDate}>Add Booking Day</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingDays.map((day, index) => (
                  <div key={index} className="border border-white/10 rounded-md p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-findvenue text-white">Day {index + 1}</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeBookingDay(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Date</Label>
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
                              disabled={(date) => {
                                return isBefore(date, new Date()) || 
                                  bookedDates.some(bookedDate => 
                                    format(bookedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                                  );
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Start Time</Label>
                          <Select
                            value={day.startTime}
                            onValueChange={(value) => {
                              const startHour = parseInt(value.split(':')[0]);
                              const endHour = parseInt(day.endTime.split(':')[0]);
                              
                              if (startHour >= endHour) {
                                const newEndTime = `${Math.min(startHour + 2, 21).toString().padStart(2, '0')}:00`;
                                updateBookingDay(index, 'startTime', value);
                                updateBookingDay(index, 'endTime', newEndTime);
                              } else {
                                updateBookingDay(index, 'startTime', value);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Start time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.slice(0, -1).map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs">End Time</Label>
                          <Select
                            value={day.endTime}
                            onValueChange={(value) => {
                              const startHour = parseInt(day.startTime.split(':')[0]);
                              const endHour = parseInt(value.split(':')[0]);
                              
                              if (endHour <= startHour) {
                                toast.error("End time must be after start time");
                                return;
                              }
                              
                              updateBookingDay(index, 'endTime', value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="End time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.slice(1).map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label className="text-xs">Guests</Label>
                        <Input
                          type="number"
                          min={minCapacity}
                          max={maxCapacity}
                          value={day.guests}
                          onChange={(e) => updateBookingDay(index, 'guests', parseInt(e.target.value) || minCapacity)}
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-center">
                  <Button onClick={handleAddCustomDate} variant="outline">
                    Add Another Day
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {bookingDays.length > 0 && (
          <>
            <Separator className="my-6" />
            
            <div className="grid gap-4">
              <div>
                <Label>Special Requests (Optional)</Label>
                <Textarea
                  placeholder="Any special requirements or notes for the venue owner..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="bg-background min-h-24 mt-2"
                />
              </div>
              
              <div className="bg-findvenue/10 p-4 rounded-md">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-findvenue mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">Booking Summary</h4>
                    <ul className="space-y-1 text-sm text-findvenue-text-muted">
                      <li className="flex items-center"><Check className="h-3 w-3 mr-1.5 text-green-500" />{bookingDays.length} day(s) selected</li>
                      <li className="flex items-center"><Check className="h-3 w-3 mr-1.5 text-green-500" />{pricePerHour} SAR per hour</li>
                      <li className="font-medium text-findvenue mt-2">
                        Total: {totalPrice} SAR
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {bookingDays.length === 0 && (
          <Alert className="mt-4 bg-findvenue/10 border-findvenue/20">
            <AlertDescription>
              Please select one or more dates for your booking. You can either choose a date range or add individual days.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          className="w-full bg-findvenue hover:bg-findvenue-dark"
          disabled={isSubmitting || bookingDays.length === 0}
        >
          {isSubmitting ? 'Submitting...' : 'Request Booking'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RangeBookingForm;
