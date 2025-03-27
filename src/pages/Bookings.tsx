
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Booking = {
  id: string;
  user_id: string;
  venue_id: string;
  venue_name: string;
  venue_image?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at: string;
  guests: number;
  special_requests?: string;
};

const Bookings = () => {
  const { user, isVenueOwner } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const fetchBookings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      let query;
      
      if (isVenueOwner) {
        // For venue owners, get bookings for their venues
        query = supabase
          .from('bookings')
          .select('*, venues:venue_id(name, image_url)')
          .filter('venues.owner_info->user_id', 'eq', user.id);
      } else {
        // For customers, get their own bookings
        query = supabase
          .from('bookings')
          .select('*, venues:venue_id(name, image_url)')
          .eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to match our Booking type
      const formattedBookings: Booking[] = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        venue_id: item.venue_id,
        venue_name: item.venues?.name || item.venue_name || 'Unnamed Venue',
        venue_image: item.venues?.image_url,
        booking_date: item.booking_date,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        total_price: item.total_price,
        created_at: item.created_at,
        guests: item.guests,
        special_requests: item.special_requests,
      }));
      
      setBookings(formattedBookings);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bookings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );
      
      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been cancelled successfully.',
      });
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking.',
        variant: 'destructive',
      });
    }
  };
  
  const getStatusColor = (status: string) => {
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
  
  const now = new Date();
  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.booking_date) >= now && booking.status !== 'cancelled'
  );
  const pastBookings = bookings.filter(booking => 
    new Date(booking.booking_date) < now || booking.status === 'cancelled'
  );
  
  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {isVenueOwner ? 'Venue Bookings' : 'My Bookings'}
          </h1>
          <p className="text-findvenue-text-muted mb-8">
            {isVenueOwner 
              ? 'Manage bookings for all your venues' 
              : 'View and manage your venue bookings'}
          </p>
          
          <div className="mb-6 flex space-x-2">
            <Button
              variant={activeTab === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setActiveTab('upcoming')}
              className={activeTab === 'upcoming' ? 'bg-findvenue hover:bg-findvenue-dark' : ''}
            >
              Upcoming ({upcomingBookings.length})
            </Button>
            <Button
              variant={activeTab === 'past' ? 'default' : 'outline'}
              onClick={() => setActiveTab('past')}
              className={activeTab === 'past' ? 'bg-findvenue hover:bg-findvenue-dark' : ''}
            >
              Past & Cancelled ({pastBookings.length})
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue mx-auto"></div>
              <p className="mt-4 text-findvenue-text-muted">Loading bookings...</p>
            </div>
          ) : displayBookings.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-findvenue-text-muted">
                  {activeTab === 'upcoming' 
                    ? "You don't have any upcoming bookings" 
                    : "You don't have any past bookings"}
                </p>
                {activeTab === 'upcoming' && (
                  <Button className="mt-4 bg-findvenue hover:bg-findvenue-dark" asChild>
                    <a href="/venues">Browse Venues</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {displayBookings.map((booking) => (
                <Card key={booking.id} className="glass-card border-white/10 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {booking.venue_image && (
                      <div className="w-full md:w-1/4 h-48 md:h-auto">
                        <img 
                          src={booking.venue_image} 
                          alt={booking.venue_name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className={`flex-1 p-6 ${!booking.venue_image ? 'w-full' : 'w-3/4'}`}>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">{booking.venue_name}</h3>
                            <Badge className={`ml-2 ${getStatusColor(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center text-findvenue-text-muted">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{format(new Date(booking.booking_date), 'MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center text-findvenue-text-muted">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{booking.start_time} - {booking.end_time}</span>
                            </div>
                            <div className="flex items-center text-findvenue-text-muted">
                              <Users className="h-4 w-4 mr-2" />
                              <span>{booking.guests} guests</span>
                            </div>
                            {booking.special_requests && (
                              <div className="mt-4 p-3 bg-findvenue-surface/30 rounded-md border border-white/5 text-sm">
                                <p className="font-medium mb-1">Special Requests:</p>
                                <p className="text-findvenue-text-muted">{booking.special_requests}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-between h-full">
                          <div className="text-right">
                            <p className="text-findvenue-text-muted text-sm">Total Price</p>
                            <p className="text-xl font-bold">${booking.total_price.toFixed(2)}</p>
                          </div>
                          
                          {booking.status === 'pending' && activeTab === 'upcoming' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="mt-4 border-destructive text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancel Booking
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-findvenue-card-bg border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-destructive hover:bg-destructive/90 text-white"
                                    onClick={() => cancelBooking(booking.id)}
                                  >
                                    Yes, Cancel
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookings;
