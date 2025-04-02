
import { useState, useEffect, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Clock, 
  CalendarCheck, 
  CalendarX, 
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface BookingDay {
  date: Date;
  bookings: BookingType[];
  status: 'low' | 'medium' | 'high' | 'none';
}

interface BookingType {
  id: string;
  venue_id: string;
  venue_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests: number;
  status: string;
  total_price: number;
  user_id: string;
  user_name?: string;
  special_requests?: string | null;
}

export function OwnerBookingsCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [dates, setDates] = useState<BookingDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDateBookings, setSelectedDateBookings] = useState<BookingType[]>([]);
  const [month, setMonth] = useState<Date>(new Date());
  const [showStats, setShowStats] = useState(false);

  // Fetch all bookings for the venue owner
  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // First get venue IDs owned by the user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, owner_info');
        
      if (venuesError) throw venuesError;
      
      const ownerVenues = venuesData.filter(venue => {
        if (!venue.owner_info) return false;
        
        try {
          const ownerInfo = typeof venue.owner_info === 'string' 
            ? JSON.parse(venue.owner_info) 
            : venue.owner_info;
            
          return ownerInfo.user_id === user.id;
        } catch (e) {
          console.error("Error parsing owner_info", e);
          return false;
        }
      });
      
      if (ownerVenues.length === 0) {
        setIsLoading(false);
        setBookings([]);
        return;
      }
      
      const venueIds = ownerVenues.map(venue => venue.id);
      
      // Now fetch all bookings for these venues
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, user_id')
        .in('venue_id', venueIds);
      
      if (bookingsError) throw bookingsError;
      
      // Fetch user profiles for all user IDs
      const userIds = [...new Set((bookingsData || []).map(booking => booking.user_id))];
      
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }
      
      // Map through bookings and add user_name
      const enhancedBookings = (bookingsData || []).map(booking => {
        const userProfile = userProfiles?.find(profile => profile.id === booking.user_id);
        return {
          ...booking,
          user_name: userProfile 
            ? `${userProfile.first_name} ${userProfile.last_name}` 
            : 'Unknown Customer'
        };
      });
      
      setBookings(enhancedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  // Build calendar dates with booking information
  useEffect(() => {
    if (bookings.length === 0) {
      setDates([]);
      return;
    }
    
    // Create a map of dates to bookings count
    const dateMap = new Map<string, BookingType[]>();
    
    bookings.forEach(booking => {
      const dateStr = booking.booking_date;
      const existingBookings = dateMap.get(dateStr) || [];
      dateMap.set(dateStr, [...existingBookings, booking]);
    });
    
    // Convert map to array of BookingDay objects
    const datesArray: BookingDay[] = Array.from(dateMap.entries()).map(([dateStr, dayBookings]) => {
      const bookingsCount = dayBookings.length;
      let status: 'low' | 'medium' | 'high' | 'none' = 'none';
      
      if (bookingsCount > 0 && bookingsCount <= 2) status = 'low';
      else if (bookingsCount > 2 && bookingsCount <= 5) status = 'medium';
      else if (bookingsCount > 5) status = 'high';
      
      return {
        date: new Date(dateStr),
        bookings: dayBookings,
        status
      };
    });
    
    setDates(datesArray);
    
    // If a date is selected, update the selectedDateBookings
    if (selectedDate) {
      updateSelectedDateBookings(selectedDate);
    }
  }, [bookings]);
  
  // Function to update the selected date's bookings
  const updateSelectedDateBookings = (date: Date) => {
    const matchingBookings = bookings.filter(booking => 
      isSameDay(new Date(booking.booking_date), date)
    );
    
    setSelectedDateBookings(matchingBookings);
  };
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    updateSelectedDateBookings(date);
  };
  
  // Create a rendering function for date cells
  const modifiers = useMemo(() => {
    const modifiersObj: Record<string, Date[]> = {
      hasLowBookings: [],
      hasMediumBookings: [],
      hasHighBookings: [],
    };
    
    dates.forEach(day => {
      if (day.status === 'low') {
        modifiersObj.hasLowBookings.push(day.date);
      } else if (day.status === 'medium') {
        modifiersObj.hasMediumBookings.push(day.date);
      } else if (day.status === 'high') {
        modifiersObj.hasHighBookings.push(day.date);
      }
    });
    
    return modifiersObj;
  }, [dates]);
  
  const modifiersStyles = {
    hasLowBookings: { 
      backgroundColor: 'rgba(34, 197, 94, 0.1)', 
      color: '#22c55e', 
      fontWeight: 500,
      borderRadius: '9999px' 
    },
    hasMediumBookings: { 
      backgroundColor: 'rgba(234, 179, 8, 0.2)', 
      color: '#eab308', 
      fontWeight: 500,
      borderRadius: '9999px'
    },
    hasHighBookings: { 
      backgroundColor: 'rgba(16, 185, 129, 0.2)', 
      color: '#10b981', 
      fontWeight: 700,
      borderRadius: '9999px'
    }
  };
  
  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Booking confirmed successfully',
      });
      
      // Update bookings list
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm booking',
        variant: 'destructive',
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Booking cancelled successfully',
      });
      
      // Update bookings list
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking',
        variant: 'destructive',
      });
    }
  };
  
  const getUpcomingBookings = () => {
    const now = new Date();
    return bookings
      .filter(booking => new Date(booking.booking_date) >= now)
      .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
      .slice(0, 5);
  };
  
  const getTodayBookings = () => {
    return bookings.filter(booking => isToday(new Date(booking.booking_date)));
  };
  
  const getMonthlyBookingStats = () => {
    // Get all dates in the current month
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const daysInMonth = eachDayOfInterval({ start, end });
    
    // Count bookings by status
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    let totalRevenue = 0;
    
    daysInMonth.forEach(day => {
      const dayBookings = bookings.filter(booking => 
        isSameDay(new Date(booking.booking_date), day)
      );
      
      dayBookings.forEach(booking => {
        if (booking.status === 'confirmed') {
          confirmed++;
          totalRevenue += booking.total_price;
        }
        else if (booking.status === 'pending') pending++;
        else if (booking.status === 'cancelled') cancelled++;
      });
    });
    
    return { confirmed, pending, cancelled, totalRevenue };
  };
  
  if (isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="pt-6 text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue mx-auto"></div>
          <p className="mt-4 text-findvenue-text-muted">Loading calendar...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-xl font-bold flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5 text-findvenue" />
            Bookings Calendar
          </h3>
          
          <div className="mt-2 sm:mt-0 flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-400 mr-1"></div> 1-2
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div> 3-5
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-findvenue mr-1"></div> 5+
            </Badge>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowStats(!showStats)}
              className="ml-2"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-0">
          {/* Calendar Column - Fixed on the left (3/7 of space) */}
          <div className="md:col-span-3 p-6 border-r border-white/10 min-h-[650px]">
            <div className="flex justify-between items-center mb-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const prevMonth = new Date(month);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  setMonth(prevMonth);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-medium">
                {format(month, 'MMMM yyyy')}
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const nextMonth = new Date(month);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setMonth(nextMonth);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={month}
              onMonthChange={setMonth}
              className="p-3 rounded-md pointer-events-auto"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Today's Bookings</h4>
              {getTodayBookings().length > 0 ? (
                <div className="space-y-2">
                  {getTodayBookings().map(booking => (
                    <div 
                      key={booking.id} 
                      className="flex justify-between items-center p-2 border border-white/10 rounded-md cursor-pointer hover:bg-findvenue-surface/20"
                      onClick={() => {
                        setSelectedDate(new Date(booking.booking_date));
                        updateSelectedDateBookings(new Date(booking.booking_date));
                      }}
                    >
                      <div className="flex items-center">
                        <Badge className={getBookingStatusColor(booking.status)} variant="outline">
                          {booking.status}
                        </Badge>
                        <span className="ml-2 text-sm">{booking.venue_name}</span>
                      </div>
                      <div className="text-xs text-findvenue-text-muted">
                        {booking.start_time} - {booking.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-findvenue-text-muted">No bookings for today</p>
              )}
            </div>
          </div>
          
          {/* Details/Stats Column - Right side (4/7 of space) */}
          <div className="md:col-span-4 p-6">
            {showStats ? (
              // Stats View
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    {format(month, 'MMMM yyyy')} Stats
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowStats(false)}
                  >
                    Back to Details
                  </Button>
                </div>
                
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
                  {(() => {
                    const stats = getMonthlyBookingStats();
                    return (
                      <>
                        <Card className="bg-findvenue-surface/30 backdrop-blur-sm border-white/10">
                          <CardContent className="pt-6">
                            <p className="text-sm text-findvenue-text-muted">Confirmed</p>
                            <h3 className="text-2xl font-bold flex items-center mt-1">
                              <CalendarCheck className="mr-2 h-5 w-5 text-green-400" />
                              {stats.confirmed}
                            </h3>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-findvenue-surface/30 backdrop-blur-sm border-white/10">
                          <CardContent className="pt-6">
                            <p className="text-sm text-findvenue-text-muted">Pending</p>
                            <h3 className="text-2xl font-bold flex items-center mt-1">
                              <Clock className="mr-2 h-5 w-5 text-yellow-400" />
                              {stats.pending}
                            </h3>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-findvenue-surface/30 backdrop-blur-sm border-white/10">
                          <CardContent className="pt-6">
                            <p className="text-sm text-findvenue-text-muted">Cancelled</p>
                            <h3 className="text-2xl font-bold flex items-center mt-1">
                              <CalendarX className="mr-2 h-5 w-5 text-destructive" />
                              {stats.cancelled}
                            </h3>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-findvenue-surface/30 backdrop-blur-sm border-white/10">
                          <CardContent className="pt-6">
                            <p className="text-sm text-findvenue-text-muted">Revenue</p>
                            <h3 className="text-2xl font-bold flex items-center mt-1">
                              <DollarSign className="mr-2 h-5 w-5 text-green-400" />
                              SAR {stats.totalRevenue.toFixed(0)}
                            </h3>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>
                
                <h4 className="text-sm font-medium mb-2">Upcoming Bookings</h4>
                {getUpcomingBookings().length > 0 ? (
                  <div className="space-y-2">
                    {getUpcomingBookings().map(booking => (
                      <div 
                        key={booking.id} 
                        className="bg-findvenue-surface/20 backdrop-blur-sm border border-white/10 p-3 rounded-md flex justify-between items-center cursor-pointer hover:bg-findvenue-surface/30 transition-colors"
                        onClick={() => {
                          setSelectedDate(new Date(booking.booking_date));
                          updateSelectedDateBookings(new Date(booking.booking_date));
                          setShowStats(false);
                        }}
                      >
                        <div>
                          <div className="font-medium">{booking.venue_name}</div>
                          <div className="text-sm text-findvenue-text-muted">
                            {format(new Date(booking.booking_date), 'MMMM d, yyyy')} • {booking.start_time}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge className={getBookingStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          <ChevronRight className="ml-2 h-4 w-4 text-findvenue-text-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-findvenue-text-muted">No upcoming bookings</p>
                )}
              </div>
            ) : (
              // Details View for Selected Date
              <div>
                {selectedDate ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2 text-findvenue" />
                        {format(selectedDate, 'MMMM d, yyyy')}
                      </h3>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="font-mono">
                          {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowStats(true)}
                        >
                          View Stats
                        </Button>
                      </div>
                    </div>
                    
                    <Separator className="mb-4" />
                    
                    {selectedDateBookings.length > 0 ? (
                      <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                        {selectedDateBookings.map(booking => (
                          <div key={booking.id} className="bg-findvenue-card-bg/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                            <div className="flex flex-col md:flex-row md:justify-between">
                              <div className="mb-3 md:mb-0">
                                <h4 className="text-lg font-medium mb-1 flex items-center">
                                  {booking.venue_name}
                                  <Badge className={`ml-2 ${getBookingStatusColor(booking.status)}`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </Badge>
                                </h4>
                                <div className="flex items-center text-findvenue-text-muted text-sm">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>{booking.start_time} - {booking.end_time}</span>
                                </div>
                                <div className="flex items-center text-findvenue-text-muted text-sm mt-1">
                                  <Users className="h-4 w-4 mr-1" />
                                  <span>{booking.guests} guests</span>
                                </div>
                                <div className="text-sm mt-1">
                                  Booked by: {booking.user_name}
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-start md:items-end">
                                <div className="flex items-center">
                                  <DollarSign className="h-4 w-4 mr-1 text-green-400" />
                                  <span className="font-semibold">SAR {booking.total_price.toFixed(2)}</span>
                                </div>
                                
                                {booking.status === 'pending' && (
                                  <div className="flex mt-2 gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="border-green-500 text-green-500 hover:bg-green-500/10"
                                      onClick={() => handleConfirmBooking(booking.id)}
                                    >
                                      <CalendarCheck className="h-4 w-4 mr-1" />
                                      Confirm
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="border-destructive text-destructive hover:bg-destructive/10"
                                      onClick={() => handleCancelBooking(booking.id)}
                                    >
                                      <CalendarX className="h-4 w-4 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {booking.special_requests && (
                              <div className="mt-4 pt-2 border-t border-white/10">
                                <p className="text-sm font-medium mb-1">Special Requests:</p>
                                <p className="text-sm text-findvenue-text-muted">{booking.special_requests}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto text-findvenue-text-muted opacity-50 mb-4" />
                        <p className="text-findvenue-text-muted">No bookings for this date</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-findvenue-text-muted">Select a date to view bookings</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
