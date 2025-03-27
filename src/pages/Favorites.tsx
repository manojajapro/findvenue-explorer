
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { VenueCard } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const Favorites = () => {
  const { getUserFavorites, user } = useAuth();
  const { toast } = useToast();
  const [favoriteVenues, setFavoriteVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchFavoriteVenues();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const fetchFavoriteVenues = async () => {
    setIsLoading(true);
    
    try {
      // Get favorite venue IDs from user profile
      const favoriteIds = await getUserFavorites();
      
      if (!favoriteIds || favoriteIds.length === 0) {
        setFavoriteVenues([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch venue details for each favorite
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .in('id', favoriteIds);
        
      if (error) throw error;
      
      setFavoriteVenues(data || []);
    } catch (error: any) {
      console.error('Error fetching favorite venues:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load favorite venues.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFavoriteRemoved = (venueId: string) => {
    // Update the local state when a venue is removed from favorites
    setFavoriteVenues(prev => prev.filter(venue => venue.id !== venueId));
  };
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">My Favorites</h1>
          <p className="text-findvenue-text-muted mb-8">
            View and manage your favorite venues
          </p>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue mx-auto"></div>
              <p className="mt-4 text-findvenue-text-muted">Loading favorite venues...</p>
            </div>
          ) : favoriteVenues.length === 0 ? (
            <div className="text-center py-12 bg-findvenue-card-bg border border-white/10 rounded-lg">
              <h3 className="text-xl font-medium mb-2">No Favorites Yet</h3>
              <p className="text-findvenue-text-muted mb-6">
                You haven't added any venues to your favorites list.
              </p>
              <a 
                href="/venues" 
                className="inline-block px-6 py-3 rounded-md bg-findvenue hover:bg-findvenue-dark text-white transition-colors"
              >
                Browse Venues
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={{
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
                    availability: venue.availability || []
                  }}
                  onFavoriteRemoved={handleFavoriteRemoved}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;
