
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  MapPin, 
  Users, 
  Calendar, 
  Clock, 
  Wifi, 
  Car, 
  Music, 
  UtensilsCrossed, 
  ChevronLeft,
  Share2
} from 'lucide-react';
import { VenueCard } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from '@/hooks/useSupabaseVenues';

// Map amenities to icons
const amenityIcons: Record<string, JSX.Element> = {
  'WiFi': <Wifi className="w-4 h-4" />,
  'Parking': <Car className="w-4 h-4" />,
  'Sound System': <Music className="w-4 h-4" />,
  'Catering': <UtensilsCrossed className="w-4 h-4" />,
};

const VenueDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [similarVenues, setSimilarVenues] = useState<Venue[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
    
    const fetchVenueDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      
      try {
        // Fetch venue details
        const { data: venueData, error } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (venueData) {
          const transformedVenue: Venue = {
            id: venueData.id,
            name: venueData.name,
            description: venueData.description || '',
            imageUrl: venueData.image_url || '',
            galleryImages: venueData.gallery_images || [],
            address: venueData.address || '',
            city: venueData.city_name || '',
            cityId: venueData.city_id || '',
            category: venueData.category_name || '',
            categoryId: venueData.category_id || '',
            capacity: {
              min: venueData.min_capacity || 0,
              max: venueData.max_capacity || 0
            },
            pricing: {
              currency: venueData.currency || 'SAR',
              startingPrice: venueData.starting_price || 0,
              pricePerPerson: venueData.price_per_person || 0
            },
            amenities: venueData.amenities || [],
            rating: venueData.rating || 0,
            reviews: venueData.reviews_count || 0,
            featured: venueData.featured || false,
            popular: venueData.popular || false,
            availability: venueData.availability || []
          };
          
          setVenue(transformedVenue);
          setActiveImage(transformedVenue.imageUrl);
          
          // Fetch similar venues (same category, different venue)
          const { data: similarData, error: similarError } = await supabase
            .from('venues')
            .select('*')
            .eq('category_id', venueData.category_id)
            .neq('id', id)
            .limit(4);
            
          if (similarError) throw similarError;
          
          if (similarData) {
            const transformedSimilar: Venue[] = similarData.map(venue => ({
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
                pricePerPerson: venue.price_per_person || 0
              },
              amenities: venue.amenities || [],
              rating: venue.rating || 0,
              reviews: venue.reviews_count || 0,
              featured: venue.featured || false,
              popular: venue.popular || false,
              availability: venue.availability || []
            }));
            
            setSimilarVenues(transformedSimilar);
          }
        } else {
          navigate('/venues'); // Redirect if venue not found
        }
      } catch (error) {
        console.error('Error fetching venue details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVenueDetails();
  }, [id, navigate]);
  
  if (loading) {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-findvenue-surface/50 rounded w-1/3 mb-4"></div>
            <div className="h-96 bg-findvenue-surface/50 rounded-lg mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <div className="h-10 bg-findvenue-surface/50 rounded w-2/3 mb-6"></div>
                <div className="h-4 bg-findvenue-surface/50 rounded w-full mb-3"></div>
                <div className="h-4 bg-findvenue-surface/50 rounded w-full mb-3"></div>
                <div className="h-4 bg-findvenue-surface/50 rounded w-4/5 mb-8"></div>
              </div>
              <div>
                <div className="h-64 bg-findvenue-surface/50 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!venue) {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Venue Not Found</h1>
          <p className="text-findvenue-text-muted mb-8">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/venues">
            <Button className="bg-findvenue hover:bg-findvenue-dark">
              Back to Venues
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/venues" className="flex items-center text-findvenue hover:text-findvenue-light transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to venues
          </Link>
        </div>
        
        {/* Gallery */}
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <div className="relative rounded-lg overflow-hidden aspect-[16/9]">
                <img 
                  src={activeImage} 
                  alt={venue.name} 
                  className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-105"
                />
                {venue.featured && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-findvenue-gold text-black font-medium px-3 py-1">
                      Featured
                    </Badge>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 bg-black/30 text-white hover:bg-black/50"
                  onClick={() => {/* Share functionality */}}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-1 gap-2">
              {venue.galleryImages.slice(0, 4).map((img, index) => (
                <div 
                  key={index}
                  className={`rounded-lg overflow-hidden aspect-square cursor-pointer transition-all duration-300 ${
                    activeImage === img ? 'ring-2 ring-findvenue' : 'opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`Gallery ${index+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{venue.name}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-findvenue" />
                <span>{venue.address}, {venue.city}</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1 text-findvenue" />
                <span>Capacity: {venue.capacity.min}-{venue.capacity.max} guests</span>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-findvenue-gold fill-findvenue-gold" />
                <span>{venue.rating} ({venue.reviews} reviews)</span>
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">About this venue</h2>
              <p className="text-findvenue-text-muted mb-4">{venue.description}</p>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {venue.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-findvenue/10 flex items-center justify-center mr-3">
                      {amenityIcons[amenity] || <Clock className="w-4 h-4 text-findvenue" />}
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Availability</h2>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const isAvailable = venue.availability?.includes(day);
                  return (
                    <div
                      key={day}
                      className={`py-2 rounded-md text-center text-sm ${
                        isAvailable ? 'bg-findvenue/20 text-findvenue' : 'bg-findvenue-surface/30 text-findvenue-text-muted'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-findvenue-text-muted">
                Available dates may vary. Contact venue for specific date availability.
              </p>
            </div>
          </div>
          
          {/* Sidebar */}
          <div>
            <Card className="p-6 glass-card border-white/10 sticky top-24">
              <div className="mb-4 pb-4 border-b border-white/10">
                <div className="text-2xl font-bold mb-1">
                  {venue.pricing.currency} {venue.pricing.startingPrice.toLocaleString()}
                </div>
                <div className="text-findvenue-text-muted text-sm">
                  Starting price
                </div>
              </div>
              
              {venue.pricing.pricePerPerson && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <span>Price per person</span>
                    <span>{venue.pricing.currency} {venue.pricing.pricePerPerson}</span>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Calendar className="w-5 h-5 mr-2 text-findvenue" />
                  <span className="font-medium">Check availability</span>
                </div>
                
                {/* Date picker would go here */}
                <div className="bg-findvenue-surface/50 rounded-md p-3 text-center mb-4">
                  Select a date to check availability
                </div>
              </div>
              
              <Button className="w-full bg-findvenue hover:bg-findvenue-dark mb-3">
                Book This Venue
              </Button>
              
              <Button variant="outline" className="w-full border-white/20 hover:bg-findvenue-surface/50">
                Contact Host
              </Button>
            </Card>
          </div>
        </div>
        
        {/* Similar Venues */}
        {similarVenues.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Similar Venues You Might Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarVenues.map((venue) => (
                <div 
                  key={venue.id} 
                  className="h-full cursor-pointer" 
                  onClick={() => navigate(`/venue/${venue.id}`)}
                >
                  <VenueCard venue={venue} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueDetails;
