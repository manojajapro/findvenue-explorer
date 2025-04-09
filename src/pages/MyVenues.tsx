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
import { 
  BarChart3, Calendar, DollarSign, Users, PlusCircle, Edit, 
  Trash2, Activity, ChevronLeft, ChevronRight
} from 'lucide-react';
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
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
        
        const { error: deleteError } = await supabase
          .from('venues')
          .delete()
          .eq('id', venueId);
        
        if (deleteError) throw deleteError;
        
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevMonthDate = new Date(year, month, -i);
      days.unshift({
        date: prevMonthDate.getDate(),
        fullDate: prevMonthDate,
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({
        date: i,
        fullDate: currentDate,
        isCurrentMonth: true,
        isToday: currentDate.toDateString() === new Date().toDateString()
      });
    }
    
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      days.push({
        date: i,
        fullDate: nextMonthDate,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return recentBookings.filter(booking => booking.booking_date === dateString);
  };

  const getTodayBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return recentBookings.filter(booking => booking.booking_date === today);
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
      
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-[#0f172a] to-[#020617]">
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
            <TabsList className="flex justify-center mb-6 bg-findvenue-surface/50 p-1 rounded-lg">
              <TabsTrigger value="dashboard" className="flex-1">Dashboard</TabsTrigger>
              <TabsTrigger value="venues" className="flex-1">My Venues</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1">Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
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
                
                <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
                  <CardContent className="flex items-center p-6">
                    <div className="mr-4 p-3 rounded-full bg-indigo-500/10">
                      <Activity className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm text-findvenue-text-muted">Active Bookings</p>
                      <h3 className="text-2xl font-bold">{stats.activeBookings}</h3>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
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
                
                <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
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
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10 lg:col-span-2">
                  <CardHeader className="border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-findvenue" />
                        <CardTitle>Bookings Calendar</CardTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center text-sm">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                          <span className="text-findvenue-text-muted">1-3</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1"></span>
                          <span className="text-findvenue-text-muted">3-6</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="h-2 w-2 rounded-full bg-findvenue mr-1"></span>
                          <span className="text-findvenue-text-muted">6+</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">
                          {selectedDate.toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric'
                          })}
                        </h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8 border-white/10"
                            onClick={handlePrevMonth}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8 border-white/10"
                            onClick={handleNextMonth}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                          <div key={index} className="text-center text-xs text-findvenue-text-muted py-2">
                            {day}
                          </div>
                        ))}
                        
                        {getDaysInMonth(selectedDate).map((day, index) => {
                          const dateBookings = getBookingsForDate(day.fullDate);
                          const bookingCount = dateBookings.length;
                          let bgColor = '';
                          
                          if (bookingCount > 6) {
                            bgColor = 'bg-findvenue hover:bg-findvenue-dark';
                          } else if (bookingCount > 3) {
                            bgColor = 'bg-yellow-600 hover:bg-yellow-700';
                          } else if (bookingCount > 0) {
                            bgColor = 'bg-green-600 hover:bg-green-700';
                          }
                          
                          return (
                            <Button
                              key={index}
                              variant="ghost"
                              className={`h-10 w-full rounded p-0 ${
                                day.isCurrentMonth 
                                  ? day.isToday
                                    ? 'border border-findvenue/50'
                                    : 'hover:bg-findvenue/10'
                                  : 'text-findvenue-text-muted/50 hover:bg-findvenue/5'
                              } ${bgColor ? `${bgColor} text-white` : ''}`}
                              onClick={() => setSelectedBooking(bookingCount > 0 ? dateBookings[0] : null)}
                            >
                              <span>{day.date}</span>
                              {bookingCount > 0 && !bgColor && (
                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 h-1 w-1 bg-findvenue rounded-full"></div>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {selectedBooking && (
                      <div className="p-4 border-t border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{formatDate(selectedBooking.booking_date)}</h4>
                          <Badge className={
                            selectedBooking.status === 'confirmed' ? 'bg-green-500 text-xs py-0.5' :
                            selectedBooking.status === 'pending' ? 'bg-yellow-500 text-xs py-0.5' :
                            selectedBooking.status === 'cancelled' ? 'bg-red-500 text-xs py-0.5' :
                            'bg-blue-500 text-xs py-0.5'
                          }>
                            {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
                          <div className="sm:col-span-2">
                            <span className="text-findvenue-text-muted block text-xs">Venue</span>
                            <span>{selectedBooking.venue_name}</span>
                          </div>
                          <div>
                            <span className="text-findvenue-text-muted block text-xs">Time</span>
                            <span>{selectedBooking.start_time} - {selectedBooking.end_time}</span>
                          </div>
                          <div>
                            <span className="text-findvenue-text-muted block text-xs">Guests</span>
                            <span>{selectedBooking.guests}</span>
                          </div>
                          <div>
                            <span className="text-findvenue-text-muted block text-xs">Amount</span>
                            <span className="font-medium">SAR {selectedBooking.total_price.toLocaleString()}</span>
                          </div>
                        </div>
                        {selectedBooking.customer_email && (
                          <div className="mt-2 text-sm">
                            <span className="text-findvenue-text-muted block text-xs">Customer</span>
                            <span>{selectedBooking.customer_email} • {selectedBooking.customer_phone || 'No phone'}</span>
                          </div>
                        )}
                        {selectedBooking.special_requests && (
                          <div className="mt-2 text-sm">
                            <span className="text-findvenue-text-muted block text-xs">Special Requests</span>
                            <span>{selectedBooking.special_requests}</span>
                          </div>
                        )}
                        <Button 
                          className="mt-4 bg-findvenue hover:bg-findvenue-dark"
                          size="sm"
                          onClick={() => navigate('/customer-bookings')}
                        >
                          View All Bookings
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10">
                  <CardHeader className="border-b border-white/10 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Bookings</CardTitle>
                      <Button 
                        variant="link" 
                        className="text-findvenue p-0 h-auto"
                        onClick={() => navigate('/customer-bookings')}
                      >
                        View Stats
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 mt-2">
                      <h4 className="text-sm font-medium mb-3">Today's Bookings</h4>
                      {getTodayBookings().length > 0 ? (
                        <div className="space-y-2">
                          {getTodayBookings().map((booking) => (
                            <div key={booking.id} className="p-3 bg-findvenue-surface/30 border border-white/5 rounded-lg">
                              <div className="flex justify-between items-center">
                                <Badge className={
                                  booking.status === 'confirmed' ? 'bg-green-500 text-xs py-0.5' :
                                  booking.status === 'pending' ? 'bg-yellow-500 text-xs py-0.5' :
                                  'bg-blue-500 text-xs py-0.5'
                                }>
                                  {booking.status}
                                </Badge>
                                <span className="text-xs text-findvenue-text-muted">{booking.start_time} - {booking.end_time}</span>
                              </div>
                              <p className="text-sm font-medium mt-1">{booking.venue_name}</p>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-findvenue-text-muted">{booking.guests} guests</span>
                                <span className="text-sm font-medium">SAR {booking.total_price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-3 text-findvenue-text-muted text-sm">No bookings today</p>
                      )}
                    </div>
                    
                    {recentBookings.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Upcoming Bookings</h4>
                        {recentBookings.slice(0, 5).map((booking) => (
                          <div key={booking.id} className="flex flex-col p-3 bg-findvenue-surface/30 border border-white/5 rounded-lg hover:bg-findvenue-surface/50 transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="text-xs">{formatDate(booking.booking_date)}</span>
                              <Badge className={
                                booking.status === 'confirmed' ? 'bg-green-500 text-xs py-0.5' :
                                booking.status === 'pending' ? 'bg-yellow-500 text-xs py-0.5' :
                                booking.status === 'cancelled' ? 'bg-red-500 text-xs py-0.5' :
                                'bg-blue-500 text-xs py-0.5'
                              }>
                                {booking.status}
                              </Badge>
                            </div>
                            <p className="font-medium mt-1">{booking.venue_name}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-findvenue-text-muted">
                                {booking.start_time} - {booking.end_time} • {booking.guests} guests
                              </span>
                              <span className="font-medium">SAR {booking.total_price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 text-findvenue-text-muted">No recent bookings</p>
                    )}
                    
                    <Button 
                      variant="outline"
                      className="w-full mt-4 border-white/10"
                      onClick={() => navigate('/customer-bookings')}
                    >
                      View All Bookings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="venues">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10">
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
                    <Card key={venue.id} className="bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10 overflow-hidden hover:border-white/20 transition-all">
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
                            <Trash2 className="h-4 w-4 text-white" />
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
                <Card className="p-8 text-center bg-findvenue-card-bg/80 backdrop-blur-sm border-white/10">
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
