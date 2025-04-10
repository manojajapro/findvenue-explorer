
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, ChevronLeft, ChevronRight, User, Users, Clock, DollarSign, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, addMonths, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

interface Booking {
  id: string;
  user_id: string;
  user_name: string;
  venue_id: string;
  venue_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  guests: number;
  created_at: string;
  special_requests?: string;
  customer_email?: string;
  customer_phone?: string;
}

export const OwnerBookingsCalendar = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  const fetchOwnerBookings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // First get venues owned by the current user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, owner_info');
        
      if (venuesError) {
        console.error('Error fetching venues:', venuesError);
        throw venuesError;
      }
      
      // Filter to only include venues owned by this user
      const ownerVenues = venuesData?.filter(venue => {
        if (!venue.owner_info) return false;
        
        try {
          const ownerInfo = typeof venue.owner_info === 'string' 
            ? JSON.parse(venue.owner_info) 
            : venue.owner_info;
            
          return ownerInfo.user_id === user.id;
        } catch (e) {
          console.error("Error parsing owner_info for venue", venue.id, e);
          return false;
        }
      });
      
      if (!ownerVenues || ownerVenues.length === 0) {
        setBookings([]);
        setIsLoading(false);
        return;
      }
      
      const venueIds = ownerVenues.map(venue => venue.id);
      
      // Then fetch all bookings for these venues
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          venue_id,
          venue_name,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          created_at,
          guests,
          special_requests,
          user_id,
          customer_email,
          customer_phone
        `)
        .in('venue_id', venueIds);
        
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }
      
      // Fetch user profiles to get names
      const userIds = (bookingsData || []).map(booking => booking.user_id);
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }
      
      // Format the bookings data
      const formattedBookings = (bookingsData || []).map(booking => {
        const userProfile = userProfiles?.find(profile => profile.id === booking.user_id);
        
        return {
          id: booking.id,
          user_id: booking.user_id,
          user_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown Customer',
          venue_id: booking.venue_id,
          venue_name: booking.venue_name || 'Unnamed Venue',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          total_price: booking.total_price,
          guests: booking.guests,
          created_at: booking.created_at,
          special_requests: booking.special_requests,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
        };
      });
      
      setBookings(formattedBookings);
      
      // Process dates for calendar
      const dates = formattedBookings
        .filter(booking => booking.status !== 'cancelled')
        .map(booking => parseISO(booking.booking_date));
      
      setBookedDates(dates);
      
      // Set the selected booking if the current selected date matches a booking
      if (selectedDate) {
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        const bookingsOnSelectedDate = formattedBookings.filter(
          booking => booking.booking_date === formattedSelectedDate
        );
        
        if (bookingsOnSelectedDate.length > 0) {
          setSelectedBooking(bookingsOnSelectedDate[0]);
        } else {
          setSelectedBooking(null);
        }
      }
      
    } catch (error: any) {
      console.error('Error fetching bookings for calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOwnerBookings();
  }, [user]);
  
  useEffect(() => {
    if (selectedDate) {
      const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
      const bookingsOnSelectedDate = bookings.filter(
        booking => booking.booking_date === formattedSelectedDate
      );
      
      if (bookingsOnSelectedDate.length > 0) {
        setSelectedBooking(bookingsOnSelectedDate[0]);
      } else {
        setSelectedBooking(null);
      }
    }
  }, [selectedDate, bookings]);
  
  const nextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonth(prev => addMonths(prev, -1));
  };
  
  // Custom day content for the calendar
  const isDayBooked = (date: Date) => {
    return bookedDates.some(bookedDate => 
      format(bookedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };
  
  // Count bookings on a specific date
  const getBookingsCountForDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return bookings.filter(booking => 
      booking.booking_date === formattedDate && booking.status !== 'cancelled'
    ).length;
  };
  
  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return bookings.filter(booking => booking.booking_date === formattedDate);
  };
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const modifiersStyles = {
    booked: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      color: 'rgba(239, 68, 68, 0.9)',
      fontWeight: 'bold',
      position: 'relative' as const,
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Bookings Calendar</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-findvenue-card-bg border border-white/10 rounded-lg p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateClick}
            className="w-full"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiersStyles={modifiersStyles}
            modifiers={{
              booked: (date) => isDayBooked(date)
            }}
            components={{
              DayContent: ({ date, activeModifiers }) => {
                const bookingsCount = getBookingsCountForDate(date);
                const isDateBooked = isDayBooked(date);
                
                const currentMonthStart = startOfMonth(currentMonth);
                const currentMonthEnd = endOfMonth(currentMonth);
                const isCurrentMonth = isWithinInterval(date, {
                  start: currentMonthStart, 
                  end: currentMonthEnd
                });
                
                return (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <span className={activeModifiers.selected ? 'text-white' : ''}>
                      {date.getDate()}
                    </span>
                    {isDateBooked && isCurrentMonth && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                        <span className={`inline-block h-1 w-1 rounded-full ${
                          activeModifiers.selected ? 'bg-white' : 'bg-red-500'
                        }`}></span>
                        {bookingsCount > 1 && <span className={`inline-block h-1 w-1 rounded-full ${
                          activeModifiers.selected ? 'bg-white' : 'bg-red-500'
                        }`}></span>}
                        {bookingsCount > 2 && <span className={`inline-block h-1 w-1 rounded-full ${
                          activeModifiers.selected ? 'bg-white' : 'bg-red-500'
                        }`}></span>}
                      </div>
                    )}
                  </div>
                );
              }
            }}
          />
        </div>
        
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-findvenue"></div>
            </div>
          ) : selectedDate ? (
            <div>
              <div className="mb-4 flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-findvenue" />
                <h3 className="text-lg font-medium">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              
              {getBookingsForDate(selectedDate).length > 0 ? (
                <div className="space-y-4">
                  {getBookingsForDate(selectedDate).map((booking) => (
                    <Card key={booking.id} className="glass-card border-white/10 p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">{booking.venue_name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-500/10 text-green-500' 
                              : booking.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {booking.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-findvenue-text-muted" />
                            <span>{booking.user_name}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="mr-2 h-4 w-4 text-findvenue-text-muted" />
                            <span>{booking.guests} guests</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-findvenue-text-muted" />
                            <span>{booking.start_time} - {booking.end_time}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="mr-2 h-4 w-4 text-findvenue-text-muted" />
                            <span>SAR {booking.total_price.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {booking.customer_email && (
                          <div className="text-sm flex items-center">
                            <span className="mr-2">Email:</span>
                            <a href={`mailto:${booking.customer_email}`} className="text-findvenue hover:underline">
                              {booking.customer_email}
                            </a>
                          </div>
                        )}
                        
                        {booking.customer_phone && (
                          <div className="text-sm flex items-center">
                            <span className="mr-2">Phone:</span>
                            <a href={`tel:${booking.customer_phone}`} className="text-findvenue hover:underline">
                              {booking.customer_phone}
                            </a>
                          </div>
                        )}
                        
                        {booking.special_requests && (
                          <div className="mt-2">
                            <p className="text-sm font-medium mb-1">Special Requests:</p>
                            <p className="text-sm text-findvenue-text-muted bg-findvenue-card-bg/50 p-2 rounded">
                              {booking.special_requests}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-white/10 rounded-lg bg-findvenue-card-bg">
                  <CalendarClock className="h-10 w-10 text-findvenue-text-muted mx-auto mb-2" />
                  <h4 className="text-lg font-medium">No Bookings</h4>
                  <p className="text-findvenue-text-muted">
                    There are no bookings scheduled for this date.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-white/10 rounded-lg bg-findvenue-card-bg">
              <CalendarIcon className="h-10 w-10 text-findvenue-text-muted mx-auto mb-2" />
              <h4 className="text-lg font-medium">Select a Date</h4>
              <p className="text-findvenue-text-muted">
                Select a date on the calendar to view booking details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
