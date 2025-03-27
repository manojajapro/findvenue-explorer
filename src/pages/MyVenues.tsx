
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Users, Star, Edit2, Plus, Trash } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

const MyVenues = () => {
  const { user, getOwnerVenues } = useAuth();
  const { toast } = useToast();
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchOwnerVenues();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const fetchOwnerVenues = async () => {
    setIsLoading(true);
    
    try {
      const venuesData = await getOwnerVenues();
      setVenues(venuesData);
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
  
  const deleteVenue = async (venueId: string) => {
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);
        
      if (error) throw error;
      
      // Update local state
      setVenues(venues.filter(venue => venue.id !== venueId));
      
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
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Venues</h1>
              <p className="text-findvenue-text-muted">
                Manage your registered venues
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
              <p className="mt-4 text-findvenue-text-muted">Loading your venues...</p>
            </div>
          ) : venues.length === 0 ? (
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
        </div>
      </div>
    </div>
  );
};

export default MyVenues;
