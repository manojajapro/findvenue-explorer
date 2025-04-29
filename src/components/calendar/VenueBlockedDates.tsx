
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { CalendarX, Calendar as CalendarIcon, Clock, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from '@/components/ui/badge';

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  venue_id: string;
  start_time: string | null;
  end_time: string | null;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  start_time: string;
  end_time: string;
  guests: number;
  user_name?: string;
}

interface VenueBlockedDatesProps {
  venueId: string;
  venueName?: string;
}

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export function VenueBlockedDates({ venueId, venueName }: VenueBlockedDatesProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isFullDay, setIsFullDay] = useState(false);
  const [fetchingBookings, setFetchingBookings] = useState(false);

  // Fetch blocked dates for this venue
  const fetchBlockedDates = async () => {
    if (!venueId) return;
    
    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('venue_id', venueId)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      setBlockedDates(data || []);
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      toast({
        variant: "destructive",
        title: "Failed to load blocked dates",
        description: "There was a problem loading the blocked dates. Please try again later.",
      });
    }
  };

  // Fetch existing bookings
  const fetchExistingBookings = async () => {
    if (!venueId) return;
    
    setFetchingBookings(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, 
          booking_date, 
          start_time, 
          end_time, 
          status,
          guests, 
          user_id,
          user_name
        `)
        .eq('venue_id', venueId)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true });
        
      if (error) throw error;
      
      // Get user names for bookings without a user_name
      const bookingsWithUserNames = await Promise.all((data || []).map(async (booking) => {
        if (!booking.user_name && booking.user_id) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('first_name, last_name')
              .eq('id', booking.user_id)
              .single();
              
            if (!userError && userData) {
              booking.user_name = `${userData.first_name} ${userData.last_name}`;
            }
          } catch (e) {
            console.error('Error fetching user data:', e);
          }
        }
        return booking;
      }));
      
      setBookings(bookingsWithUserNames);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setFetchingBookings(false);
    }
  };
  
  useEffect(() => {
    fetchBlockedDates();
    fetchExistingBookings();
    
    const channel = supabase
      .channel('calendar_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'blocked_dates',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        fetchBlockedDates();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        fetchExistingBookings();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  const blockDate = async () => {
    if (!selectedDate || !venueId) return;
    
    setIsLoading(true);
    
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if the date is already blocked
      const existingBlock = blockedDates.find(bd => 
        bd.date === dateString && 
        (!bd.start_time || (bd.start_time === startTime && bd.end_time === endTime))
      );
      
      if (existingBlock) {
        toast({
          variant: "destructive",
          title: "Date already blocked",
          description: "This date/time slot is already blocked in the calendar.",
        });
        setIsLoading(false);
        return;
      }
      
      // Check for existing bookings
      const existingBookings = bookings.filter(booking => 
        booking.booking_date === dateString && 
        booking.status !== 'cancelled'
      );
      
      if (existingBookings.length > 0) {
        // If blocking the full day, check if there are any bookings on that day
        if (isFullDay && existingBookings.length > 0) {
          toast({
            variant: "destructive",
            title: "Cannot block this date",
            description: "There are existing bookings on this date. Cancel those bookings first.",
          });
          setIsLoading(false);
          return;
        }
        
        // If blocking a specific time slot, check for overlaps
        if (!isFullDay) {
          const hasOverlap = existingBookings.some(booking => {
            return startTime < booking.end_time && endTime > booking.start_time;
          });
          
          if (hasOverlap) {
            toast({
              variant: "destructive",
              title: "Cannot block this time slot",
              description: "This time slot overlaps with existing bookings. Please select a different time or cancel those bookings first.",
            });
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Block the date
      const { error } = await supabase
        .from('blocked_dates')
        .insert({
          venue_id: venueId,
          date: dateString,
          reason: reason || null,
          start_time: isFullDay ? null : startTime,
          end_time: isFullDay ? null : endTime
        });
        
      if (error) throw error;
      
      toast({
        title: "Date blocked successfully",
        description: `${format(selectedDate, 'MMMM d, yyyy')} has been marked as unavailable${!isFullDay ? ` from ${startTime} to ${endTime}` : ''}.`,
      });
      
      setReason('');
      fetchBlockedDates();
    } catch (error: any) {
      console.error('Error blocking date:', error);
      toast({
        variant: "destructive",
        title: "Failed to block date",
        description: error.message || "There was a problem blocking the date.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const unblockDate = async (id: string) => {
    setIsDeleting(id);
    
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Date unblocked",
        description: "The date has been made available again.",
      });
      
      fetchBlockedDates();
    } catch (error: any) {
      console.error('Error unblocking date:', error);
      toast({
        variant: "destructive",
        title: "Failed to unblock date",
        description: error.message || "There was a problem unblocking the date.",
      });
    } finally {
      setIsDeleting(null);
    }
  };
  
  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(booking => booking.booking_date === dateStr);
  };
  
  // Convert blocked dates to Date objects for the calendar
  const blockedDateObjects = blockedDates.map(bd => new Date(bd.date));
  
  // Convert booked dates to Date objects for the calendar
  const bookedDateObjects = bookings.map(booking => new Date(booking.booking_date));
  
  // Check if a date has bookings
  const dateHasBookings = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(booking => 
      booking.booking_date === dateStr && 
      booking.status !== 'cancelled'
    );
  };
  
  // Determine if a date should be disabled in the calendar
  const isDateDisabled = (date: Date) => {
    return dateHasBookings(date);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Block Off Dates</CardTitle>
            <CardDescription>
              Block dates when the venue is unavailable for booking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  disabled={isDateDisabled}
                  modifiers={{
                    blocked: blockedDateObjects,
                    booked: bookedDateObjects
                  }}
                  modifiersStyles={{
                    blocked: {
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      textDecoration: 'line-through'
                    },
                    booked: {
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      fontWeight: 'bold'
                    }
                  }}
                  components={{
                    DayContent: ({ date, activeModifiers }) => {
                      const dateBookings = getBookingsForDate(date);
                      return (
                        <div className="relative flex items-center justify-center w-full h-full">
                          <span className={activeModifiers.selected ? 'text-white' : ''}>
                            {date.getDate()}
                          </span>
                          {activeModifiers.blocked && (
                            <CalendarX className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-3 w-3 text-red-500" />
                          )}
                          {dateBookings.length > 0 && !activeModifiers.blocked && (
                            <Users className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-3 w-3 text-blue-500" />
                          )}
                        </div>
                      );
                    }
                  }}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input 
                    type="checkbox"
                    checked={isFullDay}
                    onChange={(e) => setIsFullDay(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">Block entire day</label>
                </div>

                {!isFullDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Time</label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Time</label>
                      <Select value={endTime} onValueChange={setEndTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Input 
                  placeholder="Reason for blocking (optional)" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button 
                  onClick={blockDate}
                  className="w-full"
                  disabled={isLoading || !selectedDate || isDateDisabled(selectedDate)}
                >
                  {isLoading ? 'Saving...' : 'Block This Date'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Blocked Dates</CardTitle>
            <CardDescription>
              Manage dates that are blocked off for {venueName || 'this venue'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex space-x-4 mb-2">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 bg-[rgba(239,68,68,0.15)] rounded-full"></span>
                  <span className="text-xs">Blocked by you</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 bg-[rgba(59,130,246,0.15)] rounded-full"></span>
                  <span className="text-xs">Booked by customer</span>
                </div>
              </div>
            </div>

            {fetchingBookings ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm mt-2 text-muted-foreground">Loading bookings...</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Customer Bookings</h3>
                  {bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bookings found for this venue.</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {bookings.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="flex items-center justify-between border rounded-md p-3"
                        >
                          <div>
                            <div className="font-medium">
                              {format(new Date(booking.booking_date), 'MMMM d, yyyy')}
                              <Badge className="ml-2" variant={booking.status === 'confirmed' ? 'default' : 'outline'}>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.start_time} - {booking.end_time}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {booking.guests} guests {booking.user_name ? `(${booking.user_name})` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-medium mb-2">Blocked Dates</h3>
                {blockedDates.length === 0 ? (
                  <div className="text-center py-4">
                    <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No dates are currently blocked.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {blockedDates.map((blockedDate) => (
                      <div 
                        key={blockedDate.id} 
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div>
                          <div className="font-medium">
                            {format(new Date(blockedDate.date), 'MMMM d, yyyy')}
                          </div>
                          {blockedDate.start_time && blockedDate.end_time && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {blockedDate.start_time} - {blockedDate.end_time}
                            </div>
                          )}
                          {blockedDate.reason && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {blockedDate.reason}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unblockDate(blockedDate.id)}
                          disabled={isDeleting === blockedDate.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VenueBlockedDates;
