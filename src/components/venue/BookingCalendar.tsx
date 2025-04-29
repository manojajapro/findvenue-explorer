
import { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, ClockIcon, Calendar, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';

interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  bookedDates: string[];
  fullyBookedDates: string[];
  dayBookedDates: string[];
  hourlyBookedDates: string[];
  bookingType: 'hourly' | 'full-day';
  venueId?: string;
}

export function BookingCalendar({
  selectedDate,
  onDateSelect,
  bookedDates,
  fullyBookedDates,
  dayBookedDates,
  hourlyBookedDates,
  bookingType,
  venueId
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Generate calendar days for the current month view
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setCalendarDays(days);
  }, [currentMonth]);
  
  // Fetch blocked dates from the blocked_dates table
  useEffect(() => {
    if (venueId) {
      const fetchBlockedDates = async () => {
        setIsLoading(true);
        try {
          console.log("Fetching blocked dates for venue:", venueId);
          const { data, error } = await supabase
            .from('blocked_dates')
            .select('date')
            .eq('venue_id', venueId);
            
          if (error) {
            console.error('Error fetching blocked dates:', error);
            return;
          }
          
          if (data && data.length > 0) {
            // Extract dates that are blocked
            const blocked = data.map(item => format(new Date(item.date), 'yyyy-MM-dd'));
            console.log("Blocked dates found:", blocked);
            setBlockedDates(blocked);
            
            // If selected date is blocked, reset selection
            if (selectedDate && blocked.includes(format(selectedDate, 'yyyy-MM-dd'))) {
              console.log("Selected date is blocked, resetting selection");
              onDateSelect(undefined);
            }
          } else {
            console.log("No blocked dates found for venue:", venueId);
            setBlockedDates([]);
          }
        } catch (err) {
          console.error('Error processing blocked dates:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchBlockedDates();
    }
  }, [venueId, selectedDate, onDateSelect]);
  
  // Helper function to check if a date is in the given array
  const isDateInArray = (date: Date, dateArray: string[]): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dateArray.includes(dateStr);
  };
  
  // Helper function to determine if a date should be disabled
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Can't book dates in the past
    if (date < today) return true;
    
    // Can't book dates blocked by venue owner
    if (blockedDates.includes(dateStr)) {
      return true;
    }
    
    // For full-day bookings, can't select dates that are fully booked or have day bookings
    if (bookingType === 'full-day' && 
        (isDateInArray(date, fullyBookedDates) || isDateInArray(date, dayBookedDates))) {
      return true;
    }
    
    // For hourly bookings, can't select dates with day bookings
    if (bookingType === 'hourly' && isDateInArray(date, dayBookedDates)) {
      return true;
    }
    
    return false;
  };
  
  return (
    <div className="w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              // Prevent selection of disabled dates
              if (date && isDateDisabled(date)) {
                onDateSelect(undefined);
                return;
              }
              onDateSelect(date);
            }}
            disabled={isDateDisabled}
            modifiers={{
              booked: (date) => isDateInArray(date, fullyBookedDates),
              dayBooked: (date) => isDateInArray(date, dayBookedDates),
              hourlyBooked: (date) => isDateInArray(date, hourlyBookedDates),
              blocked: (date) => isDateInArray(date, blockedDates),
            }}
            modifiersStyles={{
              booked: { backgroundColor: '#FEE2E2', textDecoration: 'line-through', color: '#B91C1C' },
              dayBooked: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
              hourlyBooked: { backgroundColor: '#FEF3C7', color: '#92400E' },
              blocked: { backgroundColor: '#F3E8FF', color: '#7E22CE', textDecoration: 'line-through' },
            }}
            className="rounded-md border"
          />
          
          <div className="p-3 border-t border-border bg-muted/20">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-[#FEE2E2] rounded-full"></span>
                <span className="text-xs">Fully booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-[#DBEAFE] rounded-full"></span>
                <span className="text-xs">Day booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-[#FEF3C7] rounded-full"></span>
                <span className="text-xs">Some hours booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-[#F3E8FF] rounded-full"></span>
                <span className="text-xs">Blocked by owner</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default BookingCalendar;
