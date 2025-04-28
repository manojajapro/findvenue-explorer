import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import {
  Pencil,
  Trash,
  Plus,
  Building,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Venue {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  gallery_images?: string[];
  address?: string;
  status?: string;
  category_name?: string[];
  city_name?: string;
  rating?: number;
  reviews_count?: number;
  starting_price?: number;
}

const MyVenues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyVenues();
      
      const channel = supabase
        .channel('venues_changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'venues' 
        }, () => {
          fetchMyVenues();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMyVenues = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*');
        
      if (error) {
        throw error;
      }
      
      const myVenues = data?.filter(venue => {
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
      }) || [];
      
      setVenues(myVenues);
    } catch (error: any) {
      console.error('Error fetching venues:', error.message);
      toast({
        title: "Error",
        description: "Failed to load your venues. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVenue = (id: string) => {
    navigate(`/edit-venue/${id}`);
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm("Are you sure you want to delete this venue? This action cannot be undone.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      setVenues(venues.filter(venue => venue.id !== id));
      
      toast({
        title: "Venue deleted",
        description: "Your venue has been successfully deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting venue:', error.message);
      toast({
        title: "Error",
        description: "Failed to delete venue. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleManageCalendar = (id: string) => {
    navigate(`/venue/${id}/calendar`);
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
        
        <div className="mt-4 md:mt-0">
          <Button 
            className="bg-findvenue hover:bg-findvenue-dark text-white flex items-center gap-2"
            onClick={() => navigate('/list-venue')}
          >
            <Plus className="h-4 w-4" />
            List a New Venue
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-findvenue"></div>
        </div>
      ) : venues.length === 0 ? (
        <Card className="border border-white/10 bg-findvenue-card-bg">
          <CardHeader>
            <CardTitle className="text-center">No Venues Listed Yet</CardTitle>
            <CardDescription className="text-center">
              You haven't listed any venues yet. Create your first venue listing to start hosting.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button 
              className="bg-findvenue hover:bg-findvenue-dark text-white flex items-center gap-2"
              onClick={() => navigate('/list-venue')}
            >
              <Building className="h-4 w-4" />
              List Your First Venue
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <Card key={venue.id} className="border border-white/10 bg-findvenue-card-bg overflow-hidden">
              <div className="h-48 overflow-hidden">
                <img 
                  src={
                    venue.gallery_images && venue.gallery_images.length > 0 
                      ? venue.gallery_images[0] 
                      : venue.image_url || '/placeholder.svg'
                  }
                  alt={venue.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1">{venue.name}</CardTitle>
                <CardDescription>
                  {venue.city_name || 'No location'} • {venue.category_name?.join(', ') || 'Uncategorized'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-findvenue-text-muted line-clamp-2">
                  {venue.description || 'No description provided.'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">SAR {venue.starting_price || 0}</span>
                    <span className="text-sm text-findvenue-text-muted">/day</span>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full ${
                    venue.status === 'active' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {venue.status === 'active' ? 'Active' : 'Draft'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                  onClick={() => handleEditVenue(venue.id)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
                  onClick={() => handleManageCalendar(venue.id)}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Calendar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={() => handleDeleteVenue(venue.id)}
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Delete
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
