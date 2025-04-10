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
import { PlusCircle, Edit, Trash, Calendar, Star, MapPin, Users, Clock, Building, ChevronRight } from 'lucide-react';
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
    }
  }, [user]);

  useEffect(() => {
    // Update the URL when tab changes
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Check URL params when component mounts or route changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['dashboard', 'my-venues', 'bookings'].includes(tabFromUrl)) {
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
      
      const { data, error } = await supabase
        .from('bookings')
        .select('status')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        pending: data.filter(b => b.status === 'pending').length,
        confirmed: data.filter(b => b.status === 'confirmed').length,
        completed: data.filter(b => b.status === 'completed').length,
        cancelled: data.filter(b => b.status === 'cancelled').length
      };
      
      setBookingStats(stats);
    } catch (err) {
      console.error('Error fetching booking stats:', err);
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="my-venues">My Venues</TabsTrigger>
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
                  onClick={() => setActiveTab('my-venues')}
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
                    onClick={() => setActiveTab('my-venues')}
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="my-venues" className="mt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">Loading venues...</div>
          ) : venues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <Card key={venue.id} className="overflow-hidden h-full flex flex-col">
                  <div className="relative h-48">
                    <img 
                      src={getFirstGalleryImage(venue)}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                    {venue.popular && (
                      <Badge className="absolute top-3 left-3 bg-findvenue">Popular</Badge>
                    )}
                    {venue.featured && (
                      <Badge className="absolute top-3 right-3 bg-amber-500">Featured</Badge>
                    )}
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{venue.name}</CardTitle>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm ml-1">{venue.rating || '0.0'}</span>
                      </div>
                    </div>
                    
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {venue.address}, {venue.city_name || 'Unknown location'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-4 flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-findvenue-text-muted" />
                      <span className="text-sm text-findvenue-text-muted">
                        {venue.min_capacity}-{venue.max_capacity} people
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-findvenue-text-muted" />
                      <span className="text-sm text-findvenue-text-muted">
                        {venue.type || 'Venue'}
                      </span>
                    </div>
                    
                    <p className="text-sm line-clamp-2 mt-2 text-findvenue-text-muted">
                      {venue.description || 'No description available'}
                    </p>
                    
                    <div className="mt-3">
                      <div className="font-medium">
                        {venue.starting_price > 0 ? (
                          <span>Starting from {venue.currency || 'SAR'} {venue.starting_price}</span>
                        ) : (
                          <span>Price on request</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-0 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-1/2"
                      onClick={() => navigate(`/edit-venue/${venue.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-1/2 ml-2 text-destructive border-destructive hover:bg-destructive/10"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this venue?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the venue
                            and all related data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDeleteVenue(venue.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building className="mx-auto h-16 w-16 text-findvenue-text-muted opacity-30" />
              <h3 className="mt-4 text-xl font-medium">No venues yet</h3>
              <p className="mt-2 text-findvenue-text-muted">
                You haven't listed any venues yet. Get started by adding your first venue.
              </p>
              <Button 
                className="mt-6 bg-findvenue hover:bg-findvenue-dark"
                onClick={() => navigate('/list-venue')}
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                List a Venue
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="bookings" className="mt-6">
          <OwnerBookingsCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyVenues;
