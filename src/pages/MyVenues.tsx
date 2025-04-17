import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { PlusCircle, Edit, Trash, Calendar, Star, MapPin, Users, Clock, Building, ChevronRight, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog, 
  AlertDialogTrigger, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogAction, 
  AlertDialogCancel 
} from '@/components/ui/alert-dialog';
import { OwnerBookingsCalendar } from '@/components/calendar/OwnerBookingsCalendar';
import { enableRealtimeForTable } from '@/utils/supabaseRealtime';

const MyVenues = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'dashboard'; // Default to dashboard
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  
  // Booking stats
  const [bookingStats, setBookingStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  });

  useEffect(() => {
    if (user) {
      fetchVenues();
      fetchBookingStats();
      fetchRecentBookings();
      
      // Enable realtime for bookings
      enableRealtimeForTable('bookings');
    }
  }, [user]);

  useEffect(() => {
    // Update the URL when tab changes
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Check URL params when component mounts or route changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['dashboard', 'venues'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const fetchVenues = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter venues to only show those owned by the current user
      const ownedVenues = data?.filter(venue => {
        if (!venue.owner_info) return false;
        
        let ownerInfo;
        if (typeof venue.owner_info === 'string') {
          try {
            ownerInfo = JSON.parse(venue.owner_info);
          } catch (e) {
            return false;
          }
        } else {
          ownerInfo = venue.owner_info;
        }
        
        return ownerInfo.user_id === user.id;
      }) || [];
      
      console.log('Owned venues:', ownedVenues);
      setVenues(ownedVenues);
    } catch (err: any) {
      console.error('Error fetching venues:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookingStats = async () => {
    try {
      if (!user) return;
      
      // First, get all venues owned by the current user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, owner_info');
      
      if (venuesError) {
        console.error('Error fetching venues for booking stats:', venuesError);
        return;
      }
      
      // Filter venues to only include those owned by this user
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
        console.log('No venues found for booking stats');
        return;
      }
      
      const venueIds = ownerVenues.map(venue => venue.id);
      console.log('Venue IDs for booking stats:', venueIds);
      
      // Then fetch all bookings for these venues
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('status')
        .in('venue_id', venueIds);
        
      if (bookingsError) {
        console.error('Error fetching bookings stats:', bookingsError);
        return;
      }
      
      console.log('Bookings data for stats:', bookingsData);
      
      const stats = {
        total: bookingsData?.length || 0,
        pending: bookingsData?.filter(b => b.status === 'pending').length || 0,
        confirmed: bookingsData?.filter(b => b.status === 'confirmed').length || 0,
        completed: bookingsData?.filter(b => b.status === 'completed').length || 0,
        cancelled: bookingsData?.filter(b => b.status === 'cancelled').length || 0
      };
      
      console.log('Calculated booking stats:', stats);
      setBookingStats(stats);
    } catch (err) {
      console.error('Error fetching booking stats:', err);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      if (!user) return;
      
      // Get all venues owned by the current user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, gallery_images, owner_info');
      
      if (venuesError) {
        console.error('Error fetching venues for recent bookings:', venuesError);
        return;
      }
      
      // Filter venues to only include those owned by this user
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
        console.log('No venues found for recent bookings');
        return;
      }
      
      const venueIds = ownerVenues.map(venue => venue.id);
      
      // Fetch recent bookings for these venues
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (bookingsError) {
        console.error('Error fetching recent bookings:', bookingsError);
        return;
      }
      
      // Fetch customer info for these bookings
      const userIds = bookingsData?.map(booking => booking.user_id) || [];
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }
      
      // Create venue image mapping
      const venueImageMap = ownerVenues.reduce((acc, venue) => {
        if (venue.gallery_images && Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) {
          acc[venue.id] = venue.gallery_images[0];
        }
        return acc;
      }, {});
      
      // Map bookings with user and venue info
      const recentBookingsWithInfo = bookingsData?.map(booking => {
        const userProfile = userProfiles?.find(profile => profile.id === booking.user_id);
        return {
          ...booking,
          user_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown',
          venue_image: venueImageMap[booking.venue_id] || ''
        };
      }) || [];
      
      console.log('Recent bookings with info:', recentBookingsWithInfo);
      setRecentBookings(recentBookingsWithInfo);
      
    } catch (err) {
      console.error('Error fetching recent bookings:', err);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);
      
      if (error) throw error;
      
      toast({
        title: 'Venue deleted',
        description: 'Venue has been successfully removed',
      });
      
      // Refresh the venues list
      fetchVenues();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: `Failed to delete venue: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setDeletingVenueId(null);
    }
  };

  const getFirstGalleryImage = (venue: any): string => {
    if (venue.gallery_images && Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) {
      return venue.gallery_images[0];
    }
    return 'https://placehold.co/600x400?text=No+Image';
  };

  const handleStartChat = (userId: string, userName: string, venueId: string, venueName: string) => {
    navigate(`/messages/${userId}?venueId=${venueId}&venueName=${encodeURIComponent(venueName)}`);
  };

  const renderDashboard = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Bookings</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bookingStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Confirmed Bookings</CardTitle>
            <CardDescription>Ready for hosting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bookingStats.confirmed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cancelled Bookings</CardTitle>
            <CardDescription>No longer active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bookingStats.cancelled}</div>
          </CardContent>
        </Card>
        
        {/* Recent Bookings */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Your latest venue reservations</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => navigate('/customer-bookings')}
              >
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-6 text-findvenue-text-muted">
                No bookings to display
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0"
                  >
                    <div className="flex gap-3">
                      <div className="h-12 w-12 rounded-md overflow-hidden">
                        <img 
                          src={booking.venue_image || 'https://placehold.co/100x100?text=No+Image'} 
                          alt={booking.venue_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-medium">{booking.venue_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-findvenue-text-muted">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <Badge 
                          variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'pending' ? 'secondary' :
                            booking.status === 'cancelled' ? 'destructive' :
                            booking.status === 'completed' ? 'outline' : 'default'
                          }
                        >
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </Badge>
                        <div className="text-sm text-findvenue-text-muted mt-1">
                          {booking.user_name}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleStartChat(
                          booking.user_id, 
                          booking.user_name, 
                          booking.venue_id, 
                          booking.venue_name
                        )}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Calendar Card */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Booking Calendar</CardTitle>
            <CardDescription>View your upcoming bookings</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <OwnerBookingsCalendar />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderVenues = () => {
    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Loading venues...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-findvenue"></div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (error) {
      return (
        <Alert className="mb-6">
          <AlertDescription>
            Error loading venues: {error}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (venues.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No venues found</CardTitle>
            <CardDescription>You haven't listed any venues yet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Building className="h-16 w-16 mb-4 text-findvenue-text-muted opacity-40" />
            <p className="text-center text-findvenue-text-muted mb-4">
              Start by creating your first venue listing to begin receiving bookings.
            </p>
            <Button 
              onClick={() => navigate('/list-venue')} 
              className="bg-findvenue hover:bg-findvenue-dark"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              List a Venue
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <Card key={venue.id} className="overflow-hidden">
            <div className="relative h-48">
              <img
                src={getFirstGalleryImage(venue)}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{venue.name}</CardTitle>
              <div className="flex items-center text-findvenue-text-muted">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{venue.city_name || 'Unknown location'}</span>
              </div>
              {venue.type && (
                <Badge variant="outline" className="mt-1">
                  {venue.type}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-findvenue-text-muted" />
                  <span>
                    {venue.min_capacity || 0}-{venue.max_capacity || 0} guests
                  </span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>{venue.rating || 0}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="font-medium text-lg">
                  {venue.starting_price} {venue.currency || 'SAR'}
                </span>
                <span className="text-findvenue-text-muted text-sm ml-1">
                  starting price
                </span>
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="pt-4 pb-4 flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                className="border-white/10"
                onClick={() => navigate(`/edit-venue/${venue.id}`)}
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the venue
                      and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteVenue(venue.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                variant="default" 
                size="sm"
                className="bg-findvenue hover:bg-findvenue-dark"
                onClick={() => navigate(`/venue/${venue.id}`)}
              >
                View Venue
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-findvenue">My Venues</h1>
          <p className="text-findvenue-text-muted mt-1">
            Manage your venues and listings
          </p>
        </div>
        
        <Button 
          className="mt-4 md:mt-0 bg-findvenue hover:bg-findvenue-dark flex items-center gap-2"
          onClick={() => navigate('/list-venue')}
        >
          <PlusCircle className="h-5 w-5" />
          List New Venue
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full md:w-1/3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="venues">My Venues</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          {renderDashboard()}
        </TabsContent>
        
        <TabsContent value="venues">
          {renderVenues()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyVenues;
