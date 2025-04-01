
import { useState, useEffect, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay } from "date-fns";
import { CalendarCheck, CalendarX, Users, DollarSign, Clock, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  const [showDialog, setShowDialog] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());

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
  }, [bookings]);
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    
    // Find bookings for this date
    const matchingBookings = bookings.filter(booking => 
      isSameDay(new Date(booking.booking_date), date)
    );
    
    setSelectedDateBookings(matchingBookings);
    setShowDialog(true);
  };
  
  // Create a rendering function for date cells
  const getDayClassNames = useMemo(() => {
    return (day: Date): string => {
      // Find if this day has bookings
      const bookingDay = dates.find(d => isSameDay(d.date, day));
      
      if (!bookingDay) return "";
      
      // Apply styling based on booking density
      switch(bookingDay.status) {
        case 'low':
          return "bg-green-500/10 text-green-400 rounded-full transition-colors";
        case 'medium':
          return "bg-yellow-500/20 text-yellow-500 rounded-full transition-colors";
        case 'high':
          return "bg-findvenue/20 text-findvenue rounded-full font-bold transition-colors";
        default:
          return "";
      }
    };
  }, [dates]);
  
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
    <Card className="glass-card border-white/10">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-xl font-bold">Bookings Calendar</h3>
          <div className="mt-2 sm:mt-0">
            <Badge variant="outline" className="mr-2">
              <div className="w-3 h-3 rounded-full bg-green-400 mr-1"></div> 1-2 Bookings
            </Badge>
            <Badge variant="outline" className="mr-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div> 3-5 Bookings
            </Badge>
            <Badge variant="outline">
              <div className="w-3 h-3 rounded-full bg-findvenue mr-1"></div> 5+ Bookings
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dates.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-findvenue-text-muted opacity-50 mb-4" />
            <p className="text-findvenue-text-muted">No bookings found for your venues</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setMonth(new Date())}
            >
              Return to Current Month
            </Button>
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            className="p-3 rounded-md pointer-events-auto"
            modifiersClassNames={{
              today: "bg-findvenue-surface text-findvenue-text border",
              selected: "bg-findvenue text-white",
            }}
            modifiersFns={{
              hasBookings: getDayClassNames,
            }}
          />
        )}
      </CardContent>
      
      {/* Dialog for showing bookings on a specific date */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Bookings for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedDateBookings.length === 0 
                ? 'No bookings for this date.'
                : `Showing ${selectedDateBookings.length} booking(s).`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedDateBookings.map(booking => (
              <Card key={booking.id} className="bg-findvenue-card-bg/30 backdrop-blur-sm border border-white/10">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="mb-3 md:mb-0">
                      <h4 className="text-lg font-medium mb-1">{booking.venue_name}</h4>
                      <div className="flex items-center text-findvenue-text-muted text-sm">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{booking.start_time} - {booking.end_time}</span>
                      </div>
                      <div className="flex items-center text-findvenue-text-muted text-sm mt-1">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{booking.guests} guests</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end">
                      <Badge className={getBookingStatusColor(booking.status)}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                      <div className="flex items-center mt-2">
                        <DollarSign className="h-4 w-4 mr-1 text-green-400" />
                        <span className="font-semibold">SAR {booking.total_price.toFixed(2)}</span>
                      </div>
                      <div className="text-sm mt-1">
                        Booked by: {booking.user_name}
                      </div>
                    </div>
                  </div>
                  
                  {booking.special_requests && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-sm font-medium mb-1">Special Requests:</p>
                      <p className="text-sm text-findvenue-text-muted">{booking.special_requests}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-4 gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-green-500 text-green-500 hover:bg-green-500/10"
                        >
                          <CalendarCheck className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <CalendarX className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
