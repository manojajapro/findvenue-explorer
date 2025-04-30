
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { hasBookingsOnDate } from '@/utils/dateUtils';
import { format, parseISO, set } from 'date-fns';

import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Calendar as CalendarIcon, X, AlertCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface VenueBlockedDatesProps {
  venueId: string;
  venueName: string;
}

export default function VenueBlockedDates({ venueId, venueName }: VenueBlockedDatesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [alreadyBookedDates, setAlreadyBookedDates] = useState<string[]>([]);
  const [isCheckingDate, setIsCheckingDate] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [selectedBlockedId, setSelectedBlockedId] = useState<string | null>(null);
  
  const { 
    blockedDates,
    blockedDatesStrings,
    isLoading: isBlockedDatesLoading,
    blockDate,
    unblockDate
  } = useBlockedDates(venueId);

  // Generate time options for select dropdowns
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const hourFormatted = hour.toString().padStart(2, '0');
        const minFormatted = min.toString().padStart(2, '0');
        options.push(`${hourFormatted}:${minFormatted}`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Fetch booked dates to prevent blocking dates that have bookings
  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!venueId) return;
      
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('booking_date')
          .eq('venue_id', venueId)
          .in('status', ['pending', 'confirmed']);
          
        if (error) throw error;
        
        const bookedDateStrings = data.map(booking => booking.booking_date);
        setAlreadyBookedDates(bookedDateStrings);
      } catch (err) {
        console.error('Error fetching booked dates:', err);
      }
    };
    
    fetchBookedDates();
    
    // Subscribe to booking changes
    const channel = supabase
      .channel('booking_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        fetchBookedDates();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setIsCheckingDate(true);
    
    // Check if there are bookings for this date
    try {
      const hasBookings = await hasBookingsOnDate(venueId, date);
      if (hasBookings) {
        toast({
          title: "Date has bookings",
          description: `You cannot block ${format(date, 'PPP')} as there are existing bookings or requests for this date.`,
          variant: "destructive",
        });
        setSelectedDate(undefined);
      } else if (isDateBlocked(date)) {
        // Find the blocked date ID
        const blockedDate = blockedDates.find(bd => bd.date === format(date, 'yyyy-MM-dd'));
        if (blockedDate) {
          setSelectedBlockedId(blockedDate.id);
          setShowUnblockConfirm(true);
        }
      } else {
        setShowBlockConfirm(true);
      }
    } catch (err) {
      console.error('Error checking date availability:', err);
    } finally {
      setIsCheckingDate(false);
    }
  };

  const handleBlockDate = async () => {
    if (!selectedDate) return;
    
    const success = await blockDate(
      selectedDate, 
      isFullDay, 
      reason, 
      isFullDay ? null : startTime, 
      isFullDay ? null : endTime
    );
    
    if (success) {
      toast({
        title: "Date blocked",
        description: isFullDay 
          ? `${format(selectedDate, 'PPP')} has been blocked from bookings.`
          : `${format(selectedDate, 'PPP')} from ${startTime} to ${endTime} has been blocked from bookings.`,
      });
      setReason('');
      setIsFullDay(true);
      setStartTime('09:00');
      setEndTime('17:00');
    } else {
      toast({
        title: "Failed to block date",
        description: "There was an error blocking this date. Please try again.",
        variant: "destructive",
      });
    }
    setShowBlockConfirm(false);
    setSelectedDate(undefined);
  };

  const handleUnblockDate = async () => {
    if (!selectedDate) return;
    
    const success = await unblockDate(selectedDate);
    if (success) {
      toast({
        title: "Date unblocked",
        description: `${format(selectedDate, 'PPP')} is now available for bookings.`,
      });
    } else {
      toast({
        title: "Failed to unblock date",
        description: "There was an error unblocking this date. Please try again.",
        variant: "destructive",
      });
    }
    setShowUnblockConfirm(false);
    setSelectedBlockedId(null);
    setSelectedDate(undefined);
  };

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDatesStrings.includes(dateStr);
  };

  const isDateBooked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return alreadyBookedDates.includes(dateStr);
  };

  if (!user) {
    return (
      <Card className="border border-white/10 bg-findvenue-card-bg">
        <CardHeader>
          <CardTitle>Venue Calendar Management</CardTitle>
          <CardDescription>Please log in to manage your venue's availability.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border border-white/10 bg-findvenue-card-bg">
      <CardHeader>
        <CardTitle>Venue Availability Management</CardTitle>
        <CardDescription>
          Block dates or specific time slots on your calendar to prevent new bookings. You cannot block dates that already have bookings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Managing your venue calendar</p>
            <ul className="list-disc pl-5 text-sm mt-1">
              <li>Click on a date to block or unblock it</li>
              <li>You can block the entire day or specific hours</li>
              <li>Blocked dates will not be available for customer bookings</li>
              <li>You cannot block dates that already have bookings</li>
            </ul>
          </div>
        </div>

        <div className="border rounded-md p-4 bg-white">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today; // Only disable dates in the past
            }}
            modifiers={{
              blocked: (date) => isDateBlocked(date),
              booked: (date) => isDateBooked(date),
            }}
            modifiersStyles={{
              blocked: { backgroundColor: '#F3F4F6', color: '#6B7280' },
              booked: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
            }}
            className="rounded-md"
          />
          
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-[#F3F4F6] rounded-full"></span>
              <span className="text-sm">Blocked by you</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-[#FEE2E2] rounded-full"></span>
              <span className="text-sm">Has bookings (cannot be blocked)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-white border border-gray-300 rounded-full"></span>
              <span className="text-sm">Available (click to block)</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Currently Blocked Dates</h3>
          {isBlockedDatesLoading ? (
            <div className="py-4 text-center">Loading...</div>
          ) : blockedDates.length === 0 ? (
            <div className="py-4 text-center text-findvenue-text-muted">
              No dates are currently blocked. Click on dates in the calendar above to block them.
            </div>
          ) : (
            <div className="divide-y border rounded-md bg-white">
              {blockedDates.map((blockedDate) => (
                <div key={blockedDate.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">{format(parseISO(blockedDate.date), 'PPP')}</div>
                    <div className="text-sm text-findvenue-text-muted">
                      {blockedDate.is_full_day ? 
                        'Full day blocked' : 
                        `Blocked: ${blockedDate.start_time} - ${blockedDate.end_time}`
                      }
                      {blockedDate.reason && <div>{blockedDate.reason}</div>}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedDate(parseISO(blockedDate.date));
                      setSelectedBlockedId(blockedDate.id);
                      setShowUnblockConfirm(true);
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block This Date?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDate ? (
                <div className="space-y-4">
                  <p>
                    Are you sure you want to block <span className="font-medium">{format(selectedDate, 'PPP')}</span> from bookings?
                  </p>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch 
                      id="block-full-day"
                      checked={isFullDay}
                      onCheckedChange={setIsFullDay}
                    />
                    <Label htmlFor="block-full-day" className="font-medium">Block entire day</Label>
                  </div>

                  {!isFullDay && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Select
                          value={startTime}
                          onValueChange={(value) => {
                            setStartTime(value);
                            // Make sure end time is later than start time
                            if (value >= endTime) {
                              // Find next time slot
                              const index = timeOptions.findIndex(t => t === value);
                              if (index < timeOptions.length - 1) {
                                setEndTime(timeOptions[index + 1]);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.filter(time => time < endTime).map((time) => (
                              <SelectItem key={`start-${time}`} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <Select
                          value={endTime}
                          onValueChange={setEndTime}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.filter(time => time > startTime).map((time) => (
                              <SelectItem key={`end-${time}`} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Reason for blocking (optional)"
                      className="mt-1"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
              ) : 'Please select a date to block.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockDate}>Block Date</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock This Date?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDate ? (
                <>
                  Are you sure you want to unblock <span className="font-medium">{format(selectedDate, 'PPP')}</span>? 
                  This will make the date available for bookings.
                </>
              ) : 'Please select a blocked date to unblock.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockDate}>Unblock Date</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
