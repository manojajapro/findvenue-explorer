
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { PlusCircle, Edit, Trash, MapPin, Users, Star, Building } from 'lucide-react';
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

const MyVenues = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchVenues();
    }
  }, [user]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <h1 className="text-3xl font-bold text-findvenue mb-6">My Venues</h1>
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
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <h1 className="text-3xl font-bold text-findvenue mb-6">My Venues</h1>
        <Alert className="mb-6">
          <AlertDescription>
            Error loading venues: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-findvenue">My Venues</h1>
          <p className="text-findvenue-text-muted mt-1">
            Manage your venues and listings
          </p>
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            View Dashboard
          </Button>
          
          <Button 
            className="bg-findvenue hover:bg-findvenue-dark flex items-center gap-2"
            onClick={() => navigate('/list-venue')}
          >
            <PlusCircle className="h-5 w-5" />
            List New Venue
          </Button>
        </div>
      </div>
      
      {venues.length === 0 ? (
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
      ) : (
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
      )}
    </div>
  );
};

export default MyVenues;
