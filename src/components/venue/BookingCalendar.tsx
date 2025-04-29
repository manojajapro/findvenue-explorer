
import { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, ClockIcon, Calendar, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import CalendarLegend from './CalendarLegend';
import { useBlockedDates } from '@/hooks/useBlockedDates';

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
  
  // Use our custom hook for blocked dates
  const { 
    blockedDates,
    isLoading,
    isDateInArray,
    isDateBlocked 
  } = useBlockedDates(venueId, selectedDate, onDateSelect);
  
  // Generate calendar days for the current month view
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setCalendarDays(days);
  }, [currentMonth]);
  
  // Helper function to determine if a date should be disabled
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Can't book dates in the past
    if (date < today) return true;
    
    // Can't book dates blocked by the owner
    if (isDateBlocked(date)) {
      console.log(`Date ${dateStr} is blocked by venue owner and should be disabled`);
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
              if (!date) {
                onDateSelect(undefined);
                return;
              }

              // Check if date is blocked
              const dateStr = format(date, 'yyyy-MM-dd');
              if (blockedDates.includes(dateStr)) {
                console.log("Blocked date selected in calendar, preventing selection:", dateStr);
                onDateSelect(undefined);
                return;
              }

              // Check other disabled conditions
              if (isDateDisabled(date)) {
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
              blocked: (date) => blockedDates.includes(format(date, 'yyyy-MM-dd')),
            }}
            modifiersStyles={{
              booked: { backgroundColor: '#FEE2E2', textDecoration: 'line-through', color: '#B91C1C' },
              dayBooked: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
              hourlyBooked: { backgroundColor: '#FEF3C7', color: '#92400E' },
              blocked: { 
                backgroundColor: '#F3E8FF', 
                color: '#7E22CE', 
                textDecoration: 'line-through',
                pointerEvents: 'none',
                opacity: 0.5 
              },
            }}
            className="rounded-md border"
            fromDate={new Date()} // Prevent selecting past dates
          />
          
          <CalendarLegend />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default BookingCalendar;
