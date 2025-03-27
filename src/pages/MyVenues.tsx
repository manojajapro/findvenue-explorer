
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Users, Star, Edit2, Plus, Trash, BarChart4, Book, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';

const MyVenues = () => {
  const { user, getOwnerVenues } = useAuth();
  const { toast } = useToast();
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVenues: 0,
    totalBookings: 0,
    pendingBookings: 0,
    recentBookings: 0
  });
  
  useEffect(() => {
    if (user) {
      fetchOwnerVenues();
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const fetchOwnerVenues = async () => {
    setIsLoading(true);
    
    try {
      const venuesData = await getOwnerVenues();
      setVenues(venuesData);
      setStats(prev => ({...prev, totalVenues: venuesData.length}));
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load your venues.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      // First get all venue IDs owned by this owner
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .filter('owner_info->user_id', 'eq', user.id);
        
      if (venuesError) throw venuesError;
      
      if (venuesData && venuesData.length > 0) {
        const venueIds = venuesData.map(venue => venue.id);
        
        // Then get bookings for those venues
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .in('venue_id', venueIds)
          .order('booking_date', { ascending: false });
          
        if (bookingsError) throw bookingsError;
        
        setBookings(bookingsData || []);
        
        // Calculate stats
        const pendingCount = bookingsData ? bookingsData.filter(booking => booking.status === 'pending').length : 0;
        const recentCount = bookingsData ? bookingsData.filter(booking => {
          const bookingDate = new Date(booking.booking_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return bookingDate >= weekAgo;
        }).length : 0;
        
        setStats(prev => ({
          ...prev, 
          totalBookings: bookingsData?.length || 0,
          pendingBookings: pendingCount,
          recentBookings: recentCount
        }));
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
    }
  };
  
  const deleteVenue = async (venueId: string) => {
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);
        
      if (error) throw error;
      
      // Update local state
      setVenues(venues.filter(venue => venue.id !== venueId));
      setStats(prev => ({...prev, totalVenues: prev.totalVenues - 1}));
      
      toast({
        title: 'Venue Deleted',
        description: 'Your venue has been deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting venue:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete venue.',
        variant: 'destructive',
      });
    }
  };
  
  // Simple stats grid for the dashboard
  const StatCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="glass-card border-white/10">
        <CardContent className="p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-findvenue/10">
            <MapPin className="h-6 w-6 text-findvenue" />
          </div>
          <div>
            <p className="text-sm text-findvenue-text-muted">Total Venues</p>
            <h4 className="text-2xl font-bold">{stats.totalVenues}</h4>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card border-white/10">
        <CardContent className="p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-blue-500/10">
            <Book className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-findvenue-text-muted">Total Bookings</p>
            <h4 className="text-2xl font-bold">{stats.totalBookings}</h4>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card border-white/10">
        <CardContent className="p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-amber-500/10">
            <Calendar className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-findvenue-text-muted">Pending Bookings</p>
            <h4 className="text-2xl font-bold">{stats.pendingBookings}</h4>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card border-white/10">
        <CardContent className="p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-green-500/10">
            <BarChart4 className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-findvenue-text-muted">Recent Bookings</p>
            <h4 className="text-2xl font-bold">{stats.recentBookings}</h4>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Component for recent bookings in dashboard
  const RecentBookings = () => (
    <Card className="glass-card border-white/10 mb-8">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-4">Recent Bookings</h3>
        
        {bookings.length === 0 ? (
          <p className="text-findvenue-text-muted">No bookings yet.</p>
        ) : (
          <div className="space-y-4">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-findvenue-surface/30">
                <div>
                  <h4 className="font-medium">{booking.venue_name}</h4>
                  <div className="flex items-center text-sm text-findvenue-text-muted">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>{booking.start_time} - {booking.end_time}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge 
                    className={
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      booking.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }
                  >
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
            
            <div className="text-center mt-4">
              <Link to="/customer-bookings">
                <Button variant="outline" className="border-findvenue text-findvenue">
                  View All Bookings
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Owner Dashboard</h1>
              <p className="text-findvenue-text-muted">
                Manage your venues and bookings
              </p>
            </div>
            <Link to="/list-venue">
              <Button className="bg-findvenue hover:bg-findvenue-dark">
                <Plus className="mr-2 h-4 w-4" />
                Add New Venue
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue mx-auto"></div>
              <p className="mt-4 text-findvenue-text-muted">Loading your dashboard...</p>
            </div>
          ) : (
            <>
              <StatCards />
              <RecentBookings />
              
              <Tabs defaultValue="venues" className="mb-8">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="venues">My Venues</TabsTrigger>
                  <TabsTrigger value="bookings">My Bookings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="venues">
                  {venues.length === 0 ? (
                    <div className="text-center py-12 bg-findvenue-card-bg border border-white/10 rounded-lg">
                      <h3 className="text-xl font-medium mb-2">No Venues Listed Yet</h3>
                      <p className="text-findvenue-text-muted mb-6">
                        You haven't listed any venues yet. Add your first venue to start receiving bookings.
                      </p>
                      <Link 
                        to="/list-venue" 
                        className="inline-block px-6 py-3 rounded-md bg-findvenue hover:bg-findvenue-dark text-white transition-colors"
                      >
                        List Your First Venue
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {venues.map((venue) => (
                        <Card key={venue.id} className="glass-card border-white/10 overflow-hidden">
                          <div className="flex flex-col md:flex-row">
                            <div className="w-full md:w-1/3 h-64 md:h-auto">
                              <img 
                                src={venue.image_url || "/lovable-uploads/placeholder.png"} 
                                alt={venue.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardContent className="flex-1 p-6">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl font-bold">{venue.name}</h3>
                                    {venue.featured && <Badge className="bg-findvenue/20 text-findvenue">Featured</Badge>}
                                    {venue.popular && <Badge className="bg-orange-500/20 text-orange-400">Popular</Badge>}
                                  </div>
                                  
                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center text-findvenue-text-muted">
                                      <MapPin className="h-4 w-4 mr-2" />
                                      <span>{venue.address}</span>
                                    </div>
                                    <div className="flex items-center text-findvenue-text-muted">
                                      <Users className="h-4 w-4 mr-2" />
                                      <span>{venue.min_capacity} - {venue.max_capacity} Guests</span>
                                    </div>
                                    {venue.rating > 0 && (
                                      <div className="flex items-center text-findvenue-text-muted">
                                        <Star className="h-4 w-4 mr-2 text-yellow-400 fill-yellow-400" />
                                        <span>{venue.rating} ({venue.reviews_count} reviews)</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="mt-4">
                                    <p className="text-findvenue-text-muted line-clamp-2">
                                      {venue.description || 'No description available.'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end">
                                  <div className="text-right mb-4">
                                    <p className="text-findvenue-text-muted text-sm">Starting from</p>
                                    <p className="text-xl font-bold">${venue.starting_price}</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Link to={`/edit-venue/${venue.id}`}>
                                      <Button className="w-full bg-findvenue hover:bg-findvenue-dark">
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Edit Details
                                      </Button>
                                    </Link>
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                                          <Trash className="mr-2 h-4 w-4" />
                                          Delete Venue
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-findvenue-card-bg border-white/10">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Venue</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this venue? This action cannot be undone,
                                            and all bookings associated with this venue will also be affected.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            className="bg-destructive hover:bg-destructive/90 text-white"
                                            onClick={() => deleteVenue(venue.id)}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="bookings">
                  {bookings.length === 0 ? (
                    <div className="text-center py-12 bg-findvenue-card-bg border border-white/10 rounded-lg">
                      <h3 className="text-xl font-medium mb-2">No Bookings Yet</h3>
                      <p className="text-findvenue-text-muted mb-6">
                        You don't have any bookings for your venues yet.
                      </p>
                      <Link 
                        to="/customer-bookings" 
                        className="inline-block px-6 py-3 rounded-md bg-findvenue hover:bg-findvenue-dark text-white transition-colors"
                      >
                        View Booking Management
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <Card key={booking.id} className="glass-card border-white/10">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">{booking.venue_name}</h3>
                                <div className="flex items-center mt-2 text-findvenue-text-muted">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                                </div>
                                <div className="mt-1 text-findvenue-text-muted">
                                  <span>Time: {booking.start_time} - {booking.end_time}</span>
                                </div>
                                <div className="mt-1 text-findvenue-text-muted">
                                  <span>Guests: {booking.guests}</span>
                                </div>
                                {booking.special_requests && (
                                  <div className="mt-2">
                                    <p className="text-sm text-findvenue-text-muted">
                                      <strong>Special requests:</strong> {booking.special_requests}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-4 md:mt-0 flex flex-col items-end">
                                <Badge 
                                  className={
                                    booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                    booking.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-red-500/20 text-red-400'
                                  }
                                >
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                                <p className="mt-2 text-lg font-semibold">
                                  ${booking.total_price}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <div className="text-center mt-8">
                        <Link to="/customer-bookings">
                          <Button className="bg-findvenue hover:bg-findvenue-dark">
                            Manage All Bookings
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyVenues;
