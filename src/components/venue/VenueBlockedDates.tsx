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
import { Calendar as CalendarIcon, X, AlertCircle, Clock, Info } from 'lucide-react';
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
    <Card className="border border-white/10 bg-findvenue-card-bg shadow-xl animate-fade-in">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-findvenue to-findvenue-light bg-clip-text text-transparent">
            Venue Availability Management
          </CardTitle>
          <CalendarIcon className="h-6 w-6 text-findvenue" />
        </div>
        <CardDescription className="text-findvenue-text-muted">
          Block dates or specific time slots on your calendar to prevent new bookings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-findvenue/5 border border-findvenue/10 text-findvenue-text rounded-lg p-4 flex items-start space-x-3">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-findvenue" />
          <div>
            <p className="text-sm font-medium text-findvenue">Managing your venue calendar</p>
            <ul className="list-disc pl-5 text-sm mt-2 space-y-1 text-findvenue-text-muted">
              <li>Click on a date to block or unblock it</li>
              <li>You can block the entire day or specific hours</li>
              <li>Blocked dates will not be available for customer bookings</li>
              <li>You cannot block dates that already have bookings</li>
            </ul>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 space-y-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
            modifiers={{
              blocked: (date) => isDateBlocked(date),
              booked: (date) => isDateBooked(date),
            }}
            modifiersStyles={{
              blocked: { 
                backgroundColor: 'rgba(16, 185, 129, 0.15)', // findvenue color with opacity
                color: '#10B981', // findvenue color
                fontWeight: '600',
                borderRadius: '4px'
              },
              booked: { 
                backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                color: '#EF4444',
                fontWeight: '600',
                borderRadius: '4px'
              },
            }}
            className="rounded-md border-white/10 bg-transparent"
            classNames={{
              day_selected: "bg-findvenue text-white hover:bg-findvenue hover:text-white focus:bg-findvenue focus:text-white",
              day_today: "bg-accent text-accent-foreground font-bold",
              day: "hover:bg-findvenue/10 hover:text-findvenue focus:bg-findvenue/10 focus:text-findvenue h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_disabled: "text-findvenue-text-muted opacity-50",
              head_cell: "text-findvenue-text-muted font-normal",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              nav_button: "border border-white/10 bg-findvenue-surface hover:bg-findvenue hover:text-white",
              table: "w-full border-collapse space-y-1",
              caption: "flex justify-center pt-1 relative items-center mb-4",
              caption_label: "text-sm font-medium text-white",
              nav: "space-x-1 flex items-center",
            }}
          />
          
          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-findvenue/15 border border-findvenue/30 rounded"></span>
              <span className="text-sm text-findvenue font-medium">Blocked by you</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-red-500/15 border border-red-500/30 rounded"></span>
              <span className="text-sm text-red-500 font-medium">Has bookings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border border-white/20 rounded"></span>
              <span className="text-sm text-findvenue-text-muted">Available</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Currently Blocked Dates</h3>
            <span className="text-sm text-findvenue-text-muted">{blockedDates.length} dates blocked</span>
          </div>
          
          {isBlockedDatesLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-findvenue border-t-transparent"></div>
              <p className="mt-2 text-sm text-findvenue-text-muted">Loading blocked dates...</p>
            </div>
          ) : blockedDates.length === 0 ? (
            <div className="py-8 text-center text-findvenue-text-muted border border-dashed border-white/10 rounded-lg bg-white/5">
              <CalendarIcon className="mx-auto h-8 w-8 mb-3 text-findvenue-text-muted" />
              <p>No dates are currently blocked.</p>
              <p className="text-sm mt-1">Click on dates in the calendar above to block them.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10 border border-white/10 rounded-lg bg-white/5">
              {blockedDates.map((blockedDate) => (
                <div key={blockedDate.id} className="flex items-center justify-between p-4 group hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-white">{format(parseISO(blockedDate.date), 'PPP')}</div>
                    <div className="text-sm text-findvenue-text-muted flex items-center gap-2 mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      {blockedDate.is_full_day ? 
                        'Full day blocked' : 
                        `${blockedDate.start_time} - ${blockedDate.end_time}`
                      }
                      {blockedDate.reason && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-findvenue/10 text-findvenue">
                          {blockedDate.reason}
                        </span>
                      )}
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
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
