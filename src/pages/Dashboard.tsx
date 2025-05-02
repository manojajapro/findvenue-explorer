import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { ChevronRight, Calendar, MessageCircle, Building, Users, PieChart, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { enableRealtimeForTable } from '@/utils/supabaseRealtime';
import { OwnerBookingsCalendar } from '@/components/calendar/OwnerBookingsCalendar';
import BookingAnalytics from '@/components/analytics/BookingAnalytics';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SocialShareButtons from '@/components/venue/SocialShareButtons';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [venuesCount, setVenuesCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [ownerVenueIds, setOwnerVenueIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  
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
      fetchBookingStats();
      fetchRecentBookings();
      fetchVenueCount();
      
      // Enable realtime for bookings
      enableRealtimeForTable('bookings');
    }
  }, [user]);

  const fetchVenueCount = async () => {
    if (!user) return;
    
    try {
      // Get all venues owned by the current user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, owner_info');
      
      if (venuesError) {
        console.error('Error fetching venues count:', venuesError);
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
      
      setVenuesCount(ownerVenues?.length || 0);
      
      // Store venue IDs for analytics
      if (ownerVenues && ownerVenues.length > 0) {
        const venueIds = ownerVenues.map(venue => venue.id);
        setOwnerVenueIds(venueIds);
        
        // Calculate total revenue from confirmed bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('total_price, status')
          .in('venue_id', venueIds)
          .in('status', ['confirmed', 'completed']);
          
        if (bookingsError) {
          console.error('Error fetching revenue:', bookingsError);
          return;
        }
        
        const revenue = bookingsData?.reduce((total, booking) => total + Number(booking.total_price || 0), 0) || 0;
        setTotalRevenue(revenue);
      }
      
    } catch (err) {
      console.error('Error fetching venue count:', err);
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

  const handleStartChat = (userId: string, userName: string, venueId: string, venueName: string) => {
    navigate(`/messages/${userId}?venueId=${venueId}&venueName=${encodeURIComponent(venueName)}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-findvenue">Dashboard</h1>
          <p className="text-findvenue-text-muted mt-1">
            View bookings, analytics and manage your venues
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            className="bg-findvenue hover:bg-findvenue-dark flex items-center gap-2"
            onClick={() => navigate('/list-venue')}
          >
            Add New Venue
          </Button>
          <Button 
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={() => navigate('/my-venues')}
          >
            Manage Venues
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'overview' | 'analytics')}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                <CardTitle className="text-lg">Pending Bookings</CardTitle>
                <CardDescription>Need confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{bookingStats.pending}</div>
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
          </div>
          
          {/* Additional Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-findvenue mr-2" />
                  <CardTitle className="text-lg">Total Venues</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div className="text-3xl font-bold">{venuesCount}</div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-findvenue"
                  onClick={() => navigate('/my-venues')}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                  <CardTitle className="text-lg">Total Revenue</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">SAR {totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Calendar Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Calendar</CardTitle>
              <CardDescription>View your upcoming bookings</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <OwnerBookingsCalendar />
            </CardContent>
          </Card>
          
          {/* Recent Bookings */}
          <Card>
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
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          {ownerVenueIds.length > 0 ? (
            <BookingAnalytics venueIds={ownerVenueIds} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <PieChart className="h-16 w-16 text-findvenue/30 mb-4" />
                <h3 className="text-xl font-medium">No Venues Found</h3>
                <p className="text-findvenue-text-muted text-center mt-2">
                  You don't have any venues to analyze. Add venues to see booking analytics.
                </p>
                <Button 
                  className="mt-6 bg-findvenue hover:bg-findvenue-dark"
                  onClick={() => navigate('/list-venue')}
                >
                  Add New Venue
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
