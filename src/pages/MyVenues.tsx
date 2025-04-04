import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Venue } from '@/hooks/useSupabaseVenues';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, DollarSign, Users, PlusCircle, Edit } from 'lucide-react';
import { OwnerBookingsCalendar } from '@/components/calendar/OwnerBookingsCalendar';
import { Helmet } from 'react-helmet';
import { useToast } from '@/hooks/use-toast';

const MyVenues = () => {
  const { user, isVenueOwner, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const { toast } = useToast();

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
                user_id: ownerInfo.user_id || '',
                socialLinks: ownerInfo.socialLinks || {
                  facebook: '',
                  twitter: '',
                  instagram: '',
                  linkedin: ''
                }
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
              pricePerPerson: venue.price_per_person,
              hourlyRate: venue.hourly_rate || 0
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
    } finally {
      setIsLoading(false);
    }
  };

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
        .order('booking_date', { ascending: false });
      
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
        
        // Sort by booking_date in descending order before slicing
        const sortedBookings = [...bookingsData].sort((a, b) => {
          if (a.booking_date > b.booking_date) return -1;
          if (a.booking_date < b.booking_date) return 1;
          return 0;
        });
        
        setRecentBookings(sortedBookings.slice(0, 5));
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

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (window.confirm(`Are you sure you want to delete "${venueName}"? This action cannot be undone.`)) {
      try {
        // Check for active bookings first
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('venue_id', venueId)
          .neq('status', 'cancelled');
        
        if (bookingsError) throw bookingsError;
        
        if (bookings && bookings.length > 0) {
          toast({
            title: 'Cannot Delete Venue',
            description: `This venue has ${bookings.length} active booking(s). Please cancel all bookings before deleting.`,
            variant: 'destructive'
          });
          return;
        }
        
        // Delete the venue
        const { error: deleteError } = await supabase
          .from('venues')
          .delete()
          .eq('id', venueId);
        
        if (deleteError) throw deleteError;
        
        // Update venues list
        setVenues(prev => prev.filter(venue => venue.id !== venueId));
        
        toast({
          title: 'Venue Deleted',
          description: `"${venueName}" has been successfully deleted.`
        });
      } catch (error) {
        console.error('Error deleting venue:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete venue. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleAddVenue = () => {
    navigate('/list-venue');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === "bookings") {
      navigate('/customer-bookings');
    } else {
      navigate(`/my-venues?tab=${value}`, { replace: true });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Please log in to access this page.</p>
            <Button 
              className="mt-4 w-full bg-findvenue hover:bg-findvenue-dark"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <>
      <Helmet>
        <title>Venue Owner Dashboard | FindVenue</title>
        <meta name="description" content="Manage your venues, bookings and revenue in one place." />
      </Helmet>
      
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Venue Owner Dashboard</h1>
              {profile && (
                <p className="text-findvenue-text-muted">
                  Welcome, {profile.first_name} {profile.last_name}
                </p>
              )}
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

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
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
                
                <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
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
                
                <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
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
                
                <Card className="glass-card border-white/10 hover:border-white/20 transition-all">
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
              
              {/* Add Bookings Calendar */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Bookings Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <OwnerBookingsCalendar />
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentBookings.length > 0 ? (
                    <div className="space-y-3">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-findvenue-card-bg/50 rounded-lg hover:bg-findvenue-card-bg/80 transition-colors border border-white/5">
                          <div className="mb-2 sm:mb-0">
                            <p className="font-medium">{booking.venue_name}</p>
                            <p className="text-sm text-findvenue-text-muted flex flex-wrap gap-x-2">
                              <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{booking.start_time} - {booking.end_time}</span>
                              <span>•</span>
                              <span>{booking.guests} guests</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              booking.status === 'confirmed' ? 'bg-green-500' :
                              booking.status === 'pending' ? 'bg-yellow-500' :
                              booking.status === 'cancelled' ? 'bg-red-500' :
                              'bg-blue-500'
                            }>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                            <span className="font-medium whitespace-nowrap">SAR {booking.total_price.toLocaleString()}</span>
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
                    <Card key={venue.id} className="glass-card border-white/10 overflow-hidden hover:border-white/20 transition-all">
                      <div className="relative">
                        <img 
                          src={venue.imageUrl} 
                          alt={venue.name} 
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="bg-black/40 hover:bg-black/60 backdrop-blur-sm"
                            onClick={() => handleEditVenue(venue.id)}
                          >
                            <Edit className="h-4 w-4 text-white" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="bg-red-500/40 hover:bg-red-500/60 backdrop-blur-sm"
                            onClick={() => handleDeleteVenue(venue.id, venue.name)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
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
                            Regular
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

            <TabsContent value="bookings">
              <div className="text-center py-10">
                <p className="text-findvenue-text-muted mb-4">Redirecting to customer bookings...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default MyVenues;
