
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parse, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Clock, Calendar as CalendarIcon2, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockedDate {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_full_day: boolean;
  reason: string | null;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface VenueBlockedDatesProps {
  venueId: string;
}

export default function VenueBlockedDates({ venueId }: VenueBlockedDatesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [reason, setReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [venueOwnerId, setVenueOwnerId] = useState<string | null>(null);

  // Generate time options for select inputs
  const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(`${hour}:00`);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Fetch venue owner ID
  useEffect(() => {
    if (venueId) {
      const fetchVenueOwner = async () => {
        try {
          const { data, error } = await supabase
            .from('venues')
            .select('owner_info')
            .eq('id', venueId)
            .single();
            
          if (error) throw error;
          
          if (data?.owner_info) {
            const ownerInfo = typeof data.owner_info === 'string' 
              ? JSON.parse(data.owner_info) 
              : data.owner_info;
            
            setVenueOwnerId(ownerInfo.user_id);
          }
        } catch (err) {
          console.error('Error fetching venue owner:', err);
        }
      };
      
      fetchVenueOwner();
      fetchBlockedDates();
      fetchExistingBookings();
    }
  }, [venueId]);

  const fetchBlockedDates = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('venue_id', venueId);
        
      if (error) throw error;
      
      setBlockedDates(data || []);
    } catch (err) {
      console.error('Error fetching blocked dates:', err);
      toast({
        title: "Error",
        description: "Failed to load blocked dates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchExistingBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status')
        .eq('venue_id', venueId)
        .in('status', ['confirmed', 'pending']);
        
      if (error) throw error;
      
      setExistingBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const isDateBooked = (checkDate: Date): boolean => {
    if (!checkDate || !existingBookings.length) return false;
    
    const formattedDate = format(checkDate, 'yyyy-MM-dd');
    return existingBookings.some(booking => 
      booking.booking_date === formattedDate
    );
  };

  const isDateBlocked = (checkDate: Date): boolean => {
    if (!checkDate || !blockedDates.length) return false;
    
    return blockedDates.some(blockedDate => {
      const blockedDateObj = new Date(blockedDate.date);
      return isSameDay(blockedDateObj, checkDate);
    });
  };

  const handleBlockDate = async () => {
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date to block",
        variant: "destructive"
      });
      return;
    }
    
    if (!isFullDay && (!startTime || !endTime)) {
      toast({
        title: "Time required",
        description: "Please select both start and end times",
        variant: "destructive"
      });
      return;
    }
    
    if (!isFullDay && startTime >= endTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return;
    }
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Check if date is already booked by customers
    if (isDateBooked(date)) {
      toast({
        title: "Date unavailable",
        description: "This date already has customer bookings and cannot be blocked",
        variant: "destructive"
      });
      return;
    }
    
    // Check if date is already blocked
    if (isDateBlocked(date)) {
      toast({
        title: "Already blocked",
        description: "This date is already blocked",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to block dates",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('blocked_dates')
        .insert([
          {
            venue_id: venueId,
            date: formattedDate,
            start_time: isFullDay ? null : startTime,
            end_time: isFullDay ? null : endTime,
            is_full_day: isFullDay,
            reason: reason || null,
            created_by: user.id
          }
        ])
        .select();
        
      if (error) {
        console.error('Error blocking date:', error);
        throw error;
      }
      
      toast({
        title: "Date blocked",
        description: `Successfully blocked ${format(date, 'MMMM d, yyyy')}${
          isFullDay ? ' (full day)' : ` from ${startTime} to ${endTime}`
        }`,
      });
      
      // Reset form and refresh data
      setDate(undefined);
      setReason("");
      fetchBlockedDates();
      
    } catch (err) {
      console.error('Error blocking date:', err);
      toast({
        title: "Error",
        description: "Failed to block date. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Date unblocked",
        description: "Date has been successfully unblocked",
      });
      
      fetchBlockedDates();
    } catch (err) {
      console.error('Error unblocking date:', err);
      toast({
        title: "Error",
        description: "Failed to unblock date. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block Off Dates</CardTitle>
          <CardDescription>
            Block dates when the venue is unavailable for booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => {
                      // Can't block dates in the past
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      return date < today || isDateBooked(date);
                    }}
                    modifiers={{
                      booked: (date) => isDateBooked(date),
                      blocked: (date) => isDateBlocked(date),
                    }}
                    modifiersStyles={{
                      booked: {
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        textDecoration: 'line-through'
                      },
                      blocked: {
                        backgroundColor: '#DBEAFE',
                        color: '#3B82F6'
                      }
                    }}
                  />
                  <div className="p-3 border-t border-border bg-muted/20">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 bg-[#FEE2E2] rounded-full"></span>
                        <span>Booked by customers (cannot block)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 bg-[#DBEAFE] rounded-full"></span>
                        <span>Already blocked</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Blocking Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isFullDay ? 'default' : 'outline'}
                onClick={() => setIsFullDay(true)}
                className={isFullDay ? 'bg-findvenue text-white' : ''}
              >
                <CalendarIcon2 className="mr-2 h-4 w-4" />
                Full Day
              </Button>
              <Button
                type="button"
                variant={!isFullDay ? 'default' : 'outline'}
                onClick={() => setIsFullDay(false)}
                className={!isFullDay ? 'bg-findvenue text-white' : ''}
              >
                <Clock className="mr-2 h-4 w-4" />
                Specific Hours
              </Button>
            </div>
          </div>
          
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time, index) => (
                      <SelectItem key={index} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.filter(time => time > startTime).map((time, index) => (
                      <SelectItem key={index} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              placeholder="Private event, maintenance, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleBlockDate} 
            disabled={isLoading || !date}
            className="w-full bg-findvenue hover:bg-findvenue-dark"
          >
            {isLoading ? (
              <><span className="animate-spin mr-2">◌</span> Processing...</>
            ) : (
              <>Block {isFullDay ? "Full Day" : "Time Slot"}</>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Currently Blocked Dates</CardTitle>
            <CardDescription>
              Dates you have marked as unavailable for booking
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchBlockedDates}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent>
          {blockedDates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No blocked dates found. Block dates above to make them unavailable for booking.
            </div>
          ) : (
            <div className="space-y-2">
              {blockedDates
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((blockedDate) => (
                <div 
                  key={blockedDate.id} 
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(blockedDate.date), 'MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {blockedDate.is_full_day 
                        ? "Full Day" 
                        : `${blockedDate.start_time} - ${blockedDate.end_time}`
                      }
                      {blockedDate.reason && ` • ${blockedDate.reason}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnblockDate(blockedDate.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Unblock date</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
