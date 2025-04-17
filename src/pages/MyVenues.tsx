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
    if (tabFromUrl && ['dashboard', 'bookings'].includes(tabFromUrl)) {
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

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-findvenue">Venue Owner Dashboard</h1>
          <p className="text-findvenue-text-muted mt-1">
            Welcome, {user?.firstName || user?.user_metadata?.first_name || 'Owner'}
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Total Venues</CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <p className="text-3xl font-bold">{venues.length}</p>
              </CardContent>
              <CardFooter className="py-4">
                <Button 
                  variant="outline" 
                  className="w-full text-xs" 
                  onClick={() => navigate('/my-venues')}
                >
                  View All Venues
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Total Bookings</CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <p className="text-3xl font-bold">{bookingStats.total}</p>
              </CardContent>
              <CardFooter className="py-4">
                <Button 
                  variant="outline" 
                  className="w-full text-xs" 
                  onClick={() => setActiveTab('bookings')}
                >
                  View All Bookings
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Pending Bookings</CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <p className="text-3xl font-bold">{bookingStats.pending}</p>
              </CardContent>
              <CardFooter className="py-4">
                <Button 
                  variant="outline" 
                  className="w-full text-xs" 
                  onClick={() => navigate('/customer-bookings?status=pending')}
                >
                  View Pending Bookings
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Completed Bookings</CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <p className="text-3xl font-bold">{bookingStats.completed}</p>
              </CardContent>
              <CardFooter className="py-4">
                <Button 
                  variant="outline" 
                  className="w-full text-xs" 
                  onClick={() => navigate('/customer-bookings?status=completed')}
                >
                  View Completed Bookings
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bookings Calendar</CardTitle>
              <CardDescription>View and manage your upcoming bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <OwnerBookingsCalendar />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Venues</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading venues...</p>
                ) : venues.length > 0 ? (
                  <div className="space-y-4">
                    {venues.slice(0, 3).map((venue) => (
                      <div key={venue.id} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={getFirstGalleryImage(venue)} 
                            alt={venue.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{venue.name}</h4>
                          <div className="flex items-center text-findvenue-text-muted text-sm">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{venue.city_name || 'Unknown location'}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/edit-venue/${venue.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="mx-auto h-12 w-12 text-findvenue-text-muted opacity-30" />
                    <p className="mt-2 text-findvenue-text-muted">No venues yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => navigate('/list-venue')}
                    >
                      Add Your First Venue
                    </Button>
                  </div>
                )}
              </CardContent>
              {venues.length > 0 && (
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full flex items-center justify-center gap-1"
                    onClick={() => navigate('/my-venues')}
                  >
                    View All Venues
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading bookings...</p>
                ) : recentBookings.length > 0 ? (
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={booking.venue_image || 'https://placehold.co/600x400?text=No+Image'} 
                            alt={booking.venue_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{booking.venue_name}</h4>
                          <div className="flex items-center text-findvenue-text-muted text-sm mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center text-findvenue-text-muted text-sm">
                            <Users className="h-3 w-3 mr-1" />
                            <span>{booking.user_name} • {booking.guests} guests</span>
                          </div>
                        </div>
                        <Badge className={
                          booking.status === 'confirmed' ? 'bg-green-500' : 
                          booking.status === 'pending' ? 'bg-amber-500' : 
                          booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                        }>
                          {booking.status}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleStartChat(booking.user_id, booking.user_name, booking.venue_id, booking.venue_name)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-findvenue-text-muted opacity-30" />
                    <p className="mt-2 text-findvenue-text-muted">No recent bookings</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => setActiveTab('bookings')}
                    >
                      Check Bookings
                    </Button>
                  </div>
                )}
              </CardContent>
              {recentBookings.length > 0 && (
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full flex items-center justify-center gap-1"
                    onClick={() => navigate('/customer-bookings')}
                  >
                    View All Bookings
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="bookings" className="mt-6">
          <OwnerBookingsCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyVenues;
