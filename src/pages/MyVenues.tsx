
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Venue } from '@/hooks/useSupabaseVenues';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VenueCard } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, BarChart3, Calendar, DollarSign, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const MyVenues = () => {
  const { user, isVenueOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalVenues: 0,
    activeBookings: 0,
    completedBookings: 0,
    revenue: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  // Set active tab from URL query param if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab === 'venues' || tab === 'bookings') {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
      
      if (!searchParams.has('tab') || searchParams.get('tab') !== 'dashboard') {
        navigate('/my-venues?tab=dashboard', { replace: true });
      }
    }
  }, [location.search, navigate]);

  // Fetch owner venues
  const fetchVenues = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching venues for user ID:", user.id);
      
      const { data, error } = await supabase
        .from('venues')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        console.log("Venues data received:", data);
        
        // Filter venues where owner_info->user_id matches current user.id
        const userVenues = data.filter(venue => {
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
        
        console.log("Filtered user venues:", userVenues);
        
        const transformedVenues = userVenues.map(venue => {
          let ownerInfoData = undefined;
          
          try {
            if (venue.owner_info) {
              const ownerInfo = typeof venue.owner_info === 'string'
                ? JSON.parse(venue.owner_info)
                : venue.owner_info;
                
              ownerInfoData = {
                name: ownerInfo.name || '',
                contact: ownerInfo.contact || '',
                responseTime: ownerInfo.response_time || '',
                user_id: ownerInfo.user_id || ''
              };
            }
          } catch (e) {
            console.error("Error parsing owner_info for venue", venue.id, e);
          }
          
          return {
            id: venue.id,
            name: venue.name,
            description: venue.description || '',
            imageUrl: venue.image_url || '',
            galleryImages: venue.gallery_images || [],
            address: venue.address || '',
            city: venue.city_name || '',
            cityId: venue.city_id || '',
            category: venue.category_name || '',
            categoryId: venue.category_id || '',
            capacity: {
              min: venue.min_capacity || 0,
              max: venue.max_capacity || 0
            },
            pricing: {
              currency: venue.currency || 'SAR',
              startingPrice: venue.starting_price || 0,
              pricePerPerson: venue.price_per_person
            },
            amenities: venue.amenities || [],
            rating: venue.rating || 0,
            reviews: venue.reviews_count || 0,
            featured: venue.featured || false,
            popular: venue.popular || false,
            availability: venue.availability || [],
            ownerInfo: ownerInfoData
          } as Venue;
        });
        
        console.log("Transformed venues:", transformedVenues);
        setVenues(transformedVenues);
        setStats(prev => ({...prev, totalVenues: transformedVenues.length}));
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your venues',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch booking statistics and recent bookings
  const fetchBookingStats = async () => {
    if (!user) return;
    
    try {
      const venueIds = venues.map(venue => venue.id);
      
      if (venueIds.length === 0) return;
      
      console.log("Fetching bookings for venue IDs:", venueIds);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false });
      
      if (bookingsError) throw bookingsError;
      
      if (bookingsData) {
        console.log("Bookings data:", bookingsData);
        
        const activeCount = bookingsData.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
        const completedCount = bookingsData.filter(b => b.status === 'completed').length;
        const totalRevenue = bookingsData
          .filter(b => b.status !== 'cancelled')
          .reduce((sum, booking) => sum + (booking.total_price || 0), 0);
        
        setStats({
          totalVenues: venues.length,
          activeBookings: activeCount,
          completedBookings: completedCount,
          revenue: totalRevenue
        });
        
        setRecentBookings(bookingsData.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching booking stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVenues();
    }
  }, [user]);

  useEffect(() => {
    if (venues.length > 0) {
      fetchBookingStats();
    }
  }, [venues]);

  const handleEditVenue = (venueId: string) => {
    navigate(`/edit-venue/${venueId}`);
  };

  const handleAddVenue = () => {
    navigate('/list-venue');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    navigate(`/my-venues?tab=${value}`, { replace: true });
    
    if (value === "bookings") {
      navigate('/customer-bookings');
    }
  };

  if (!isVenueOwner) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Venue Owner Dashboard</h1>
            <p className="text-findvenue-text-muted">Manage your venues and bookings</p>
          </div>
          <Button 
            className="mt-4 sm:mt-0 bg-findvenue hover:bg-findvenue-dark flex items-center gap-2"
            onClick={handleAddVenue}
          >
            <PlusCircle className="h-4 w-4" />
            List New Venue
          </Button>
        </div>

        <Tabs 
          defaultValue="dashboard" 
          value={activeTab} 
          onValueChange={handleTabChange} 
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="venues">My Venues</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card border-white/10">
                <CardContent className="flex items-center p-6">
                  <div className="mr-4 p-3 rounded-full bg-findvenue/10">
                    <BarChart3 className="h-6 w-6 text-findvenue" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Total Venues</p>
                    <h3 className="text-2xl font-bold">{stats.totalVenues}</h3>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-white/10">
                <CardContent className="flex items-center p-6">
                  <div className="mr-4 p-3 rounded-full bg-indigo-500/10">
                    <Calendar className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Active Bookings</p>
                    <h3 className="text-2xl font-bold">{stats.activeBookings}</h3>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-white/10">
                <CardContent className="flex items-center p-6">
                  <div className="mr-4 p-3 rounded-full bg-green-500/10">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Completed Bookings</p>
                    <h3 className="text-2xl font-bold">{stats.completedBookings}</h3>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-white/10">
                <CardContent className="flex items-center p-6">
                  <div className="mr-4 p-3 rounded-full bg-yellow-500/10">
                    <DollarSign className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Total Revenue</p>
                    <h3 className="text-2xl font-bold">SAR {stats.revenue.toLocaleString()}</h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Bookings */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <h3 className="text-xl font-bold">Recent Bookings</h3>
              </CardHeader>
              <CardContent>
                {recentBookings.length > 0 ? (
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-findvenue-card-bg/50 rounded-lg">
                        <div>
                          <p className="font-medium">{booking.venue_name}</p>
                          <p className="text-sm text-findvenue-text-muted">
                            {new Date(booking.booking_date).toLocaleDateString()} • {booking.guests} guests
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Badge className={
                            booking.status === 'confirmed' ? 'bg-green-500' :
                            booking.status === 'pending' ? 'bg-yellow-500' :
                            booking.status === 'cancelled' ? 'bg-red-500' :
                            'bg-blue-500'
                          }>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          <span className="ml-4 font-medium">SAR {booking.total_price.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-findvenue-text-muted">No recent bookings</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Venues Tab */}
          <TabsContent value="venues">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="glass-card border-white/10">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : venues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                  <Card key={venue.id} className="glass-card border-white/10 overflow-hidden">
                    <div className="relative">
                      <img 
                        src={venue.imageUrl} 
                        alt={venue.name} 
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="bg-black/40 hover:bg-black/60 backdrop-blur-sm"
                          onClick={() => handleEditVenue(venue.id)}
                        >
                          <Edit className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                      {venue.featured ? (
                        <Badge className="absolute top-2 left-2 bg-findvenue-gold text-black">
                          Featured
                        </Badge>
                      ) : venue.popular ? (
                        <Badge className="absolute top-2 left-2 bg-findvenue text-white">
                          Popular
                        </Badge>
                      ) : (
                        <Badge className="absolute top-2 left-2 bg-gray-500/80 text-white">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xl font-semibold mb-2">{venue.name}</h3>
                      <p className="text-sm text-findvenue-text-muted mb-3">
                        {venue.city} • {venue.category}
                      </p>
                      <p className="text-sm text-findvenue-text-muted mb-4 line-clamp-2">
                        {venue.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          {venue.capacity.min}-{venue.capacity.max} guests
                        </span>
                        <span className="font-semibold">
                          SAR {venue.pricing.startingPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center glass-card border-white/10">
                <h3 className="text-xl font-semibold mb-4">No Venues Added Yet</h3>
                <p className="text-findvenue-text-muted mb-6">
                  You haven't added any venues yet. Start by listing your first venue.
                </p>
                <Button 
                  className="bg-findvenue hover:bg-findvenue-dark flex items-center gap-2 mx-auto"
                  onClick={handleAddVenue}
                >
                  <PlusCircle className="h-4 w-4" />
                  List Venue
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Bookings Tab - Only display content when active */}
          <TabsContent value="bookings">
            <div className="text-center py-10">
              <p className="text-findvenue-text-muted mb-4">Viewing customer bookings information...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyVenues;
