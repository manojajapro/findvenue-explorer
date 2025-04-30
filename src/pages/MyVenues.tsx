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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pencil,
  Trash,
  Plus,
  Building,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import VenueBlockedDates from '@/components/venue/VenueBlockedDates';

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
  const [activeTab, setActiveTab] = useState("venues");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedVenueName, setSelectedVenueName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyVenues();
      
      // Setup realtime subscription for venues
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
      
      // Filter venues owned by this user
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
      
      // Set the first venue as selected for the calendar management tab
      if (myVenues.length > 0 && !selectedVenueId) {
        setSelectedVenueId(myVenues[0].id);
        setSelectedVenueName(myVenues[0].name);
      }
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
      
      // Update venues list
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

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-findvenue to-findvenue-light bg-clip-text text-transparent">
            My Venues
          </h1>
          <p className="text-findvenue-text-muted mt-2">
            Manage your venues and listings
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Button 
            className="bg-findvenue hover:bg-findvenue-dark text-white flex items-center gap-2 shadow-lg shadow-findvenue/20 transition-all hover:scale-105"
            onClick={() => navigate('/list-venue')}
          >
            <Plus className="h-4 w-4" />
            List a New Venue
          </Button>
        </div>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-8 bg-findvenue-surface/50 border border-white/10">
          <TabsTrigger 
            value="venues"
            className="data-[state=active]:bg-findvenue data-[state=active]:text-white"
          >
            <Building className="h-4 w-4 mr-2" />
            My Venues
          </TabsTrigger>
          <TabsTrigger 
            value="availability"
            className="data-[state=active]:bg-findvenue data-[state=active]:text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Availability Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="venues">
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-findvenue border-t-transparent"></div>
            </div>
          ) : venues.length === 0 ? (
            <Card className="border border-white/10 bg-findvenue-card-bg">
              <CardHeader className="text-center">
                <Building className="h-12 w-12 mx-auto mb-4 text-findvenue opacity-50" />
                <CardTitle className="text-2xl">No Venues Listed Yet</CardTitle>
                <CardDescription>
                  You haven't listed any venues yet. Create your first venue listing to start hosting.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center">
                <Button 
                  className="bg-findvenue hover:bg-findvenue-dark text-white flex items-center gap-2 shadow-lg shadow-findvenue/20 transition-all hover:scale-105"
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
                <Card key={venue.id} className="border border-white/10 bg-findvenue-card-bg overflow-hidden group hover:border-findvenue/50 transition-colors">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={
                        venue.gallery_images && venue.gallery_images.length > 0 
                          ? venue.gallery_images[0] 
                          : venue.image_url || '/placeholder.svg'
                      }
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1 text-white">{venue.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{venue.city_name || 'No location'}</span>
                      <span className="text-findvenue-text-muted">•</span>
                      <span>{venue.category_name?.join(', ') || 'Uncategorized'}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-findvenue-text-muted line-clamp-2">
                      {venue.description || 'No description provided.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-findvenue">SAR {venue.starting_price || 0}</span>
                        <span className="text-sm text-findvenue-text-muted">/day</span>
                      </div>
                      <div className={`px-3 py-1 text-xs rounded-full ${
                        venue.status === 'active' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                        {venue.status === 'active' ? 'Active' : 'Draft'}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-4 border-t border-white/10">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10 transition-colors"
                      onClick={() => handleEditVenue(venue.id)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-findvenue/30 text-findvenue hover:bg-findvenue/10 transition-colors"
                      onClick={() => {
                        setSelectedVenueId(venue.id);
                        setSelectedVenueName(venue.name);
                        setActiveTab("availability");
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Calendar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
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
        </TabsContent>
        
        <TabsContent value="availability">
          {venues.length === 0 ? (
            <Card className="border border-white/10 bg-findvenue-card-bg">
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-findvenue opacity-50" />
                <CardTitle className="text-2xl">No Venues to Manage</CardTitle>
                <CardDescription>
                  You need to create a venue before you can manage its availability.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center">
                <Button 
                  className="bg-findvenue hover:bg-findvenue-dark text-white flex items-center gap-2 shadow-lg shadow-findvenue/20 transition-all hover:scale-105"
                  onClick={() => {
                    setActiveTab("venues");
                    navigate('/list-venue');
                  }}
                >
                  <Plus className="h-4 w-4" />
                  List a Venue
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border border-white/10 bg-findvenue-card-bg">
                <CardHeader>
                  <CardTitle>Select Venue to Manage</CardTitle>
                  <CardDescription>Choose a venue to manage its availability calendar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {venues.map(venue => (
                      <Button
                        key={venue.id}
                        variant={selectedVenueId === venue.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedVenueId(venue.id);
                          setSelectedVenueName(venue.name);
                        }}
                        className={`
                          transition-all
                          ${selectedVenueId === venue.id 
                            ? "bg-findvenue text-white shadow-lg shadow-findvenue/20" 
                            : "hover:border-findvenue/50"
                          }
                        `}
                      >
                        <Building className="h-4 w-4 mr-2" />
                        {venue.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {selectedVenueId && (
                <div className="space-y-6">
                  <VenueBlockedDates 
                    venueId={selectedVenueId} 
                    venueName={selectedVenueName || "Selected Venue"}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyVenues;
