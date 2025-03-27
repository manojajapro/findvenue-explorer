
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Calendar, 
  Heart, 
  Info, 
  Map, 
  Star, 
  Users,
  Wifi,
  ParkingSquare,
  Utensils,
  Music,
  Lightbulb,
  MonitorPlay,
  Loader2
} from 'lucide-react';
import VenueLocationMap from '@/components/map/VenueLocationMap';
import BookingForm from '@/components/venue/BookingForm';
import ContactVenueOwner from '@/components/venue/ContactVenueOwner';

const VenueDetailsComponent = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, toggleFavoriteVenue, checkIsFavorite } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  
  // Fetch venue details
  useEffect(() => {
    const fetchVenueDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          let ownerInfoData = undefined;
          if (data.owner_info) {
            const ownerInfo = data.owner_info as Record<string, any>;
            ownerInfoData = {
              name: ownerInfo.name as string,
              contact: ownerInfo.contact as string,
              responseTime: ownerInfo.response_time as string,
              userId: ownerInfo.user_id as string
            };
          }
          
          const transformedVenue: Venue = {
            id: data.id,
            name: data.name,
            description: data.description || '',
            imageUrl: data.image_url || '',
            galleryImages: data.gallery_images || [],
            address: data.address || '',
            city: data.city_name || '',
            cityId: data.city_id || '',
            category: data.category_name || '',
            categoryId: data.category_id || '',
            capacity: {
              min: data.min_capacity || 0,
              max: data.max_capacity || 0
            },
            pricing: {
              currency: data.currency || 'SAR',
              startingPrice: data.starting_price || 0,
              pricePerPerson: data.price_per_person
            },
            amenities: data.amenities || [],
            rating: data.rating || 0,
            reviews: data.reviews_count || 0,
            featured: data.featured || false,
            popular: data.popular || false,
            availability: data.availability || [],
            ownerInfo: ownerInfoData
          };
          
          setVenue(transformedVenue);
          
          // Check if it's in user's favorites
          if (user) {
            setIsFavorite(checkIsFavorite(data.id));
          }
        }
      } catch (error) {
        console.error('Error fetching venue details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load venue details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVenueDetails();
  }, [id, user]);
  
  // Handle toggling favorite status
  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!venue) return;
    
    setIsTogglingFavorite(true);
    
    try {
      await toggleFavoriteVenue(venue.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };
  
  // Navigate to previous image
  const prevImage = () => {
    if (!venue?.galleryImages) return;
    
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? venue.galleryImages.length - 1 : prevIndex - 1
    );
  };
  
  // Navigate to next image
  const nextImage = () => {
    if (!venue?.galleryImages) return;
    
    setCurrentImageIndex((prevIndex) => 
      prevIndex === venue.galleryImages.length - 1 ? 0 : prevIndex + 1
    );
  };
  
  // Select image by index
  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
  };
  
  // Render amenity icon based on name
  const renderAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-4 w-4" />;
      case 'parking':
        return <ParkingSquare className="h-4 w-4" />;
      case 'catering':
        return <Utensils className="h-4 w-4" />;
      case 'sound system':
        return <Music className="h-4 w-4" />;
      case 'lighting':
        return <Lightbulb className="h-4 w-4" />;
      case 'video equipment':
        return <MonitorPlay className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-findvenue" />
          <p className="mt-4 text-findvenue-text-muted">Loading venue details...</p>
        </div>
      </div>
    );
  }
  
  if (!venue) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-findvenue-text-muted mb-4">Venue not found</p>
          <Button onClick={() => navigate('/venues')}>Browse Venues</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center text-sm text-findvenue-text-muted">
          <Link to="/" className="hover:text-findvenue">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/venues" className="hover:text-findvenue">Venues</Link>
          <span className="mx-2">/</span>
          <Link to={`/categories?id=${venue.categoryId}`} className="hover:text-findvenue">{venue.category}</Link>
          <span className="mx-2">/</span>
          <span className="text-findvenue-text">{venue.name}</span>
        </div>
        
        {/* Venue Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{venue.name}</h1>
            
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="mr-1">{venue.rating.toFixed(1)}</span>
                <span className="text-findvenue-text-muted">({venue.reviews} reviews)</span>
              </div>
              
              <div className="flex items-center">
                <Map className="h-4 w-4 text-findvenue-text-muted mr-1" />
                <span>{venue.city}</span>
              </div>
              
              <div className="flex items-center">
                <Building className="h-4 w-4 text-findvenue-text-muted mr-1" />
                <span>{venue.category}</span>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleToggleFavorite}
            variant="outline"
            size="sm"
            disabled={isTogglingFavorite}
            className={`mt-4 md:mt-0 border-white/10 ${
              isFavorite ? 'bg-findvenue/10 text-findvenue' : ''
            }`}
          >
            <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-findvenue text-findvenue' : ''}`} />
            {isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
          </Button>
        </div>
        
        {/* Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2">
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <img
                src={venue.galleryImages[currentImageIndex] || venue.imageUrl}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
              
              {venue.galleryImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
                  >
                    &#10094;
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
                  >
                    &#10095;
                  </button>
                </>
              )}
              
              {(venue.featured || venue.popular) && (
                <div className={`absolute top-4 left-4 py-1 px-3 rounded-full font-medium text-sm ${
                  venue.featured ? 'bg-findvenue-gold text-black' : 'bg-findvenue text-white'
                }`}>
                  {venue.featured ? 'Featured' : 'Popular'}
                </div>
              )}
            </div>
            
            {venue.galleryImages.length > 1 && (
              <div className="flex overflow-x-auto mt-4 space-x-2 pb-2">
                {venue.galleryImages.map((image, index) => (
                  <div
                    key={index}
                    className={`w-24 h-16 shrink-0 rounded overflow-hidden cursor-pointer border-2 ${
                      currentImageIndex === index ? 'border-findvenue' : 'border-transparent'
                    }`}
                    onClick={() => selectImage(index)}
                  >
                    <img src={image} alt={`${venue.name} - ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1 flex flex-col">
            <div className="glass-card border-white/10 p-6 rounded-lg mb-4 flex-1">
              <h3 className="text-xl font-semibold mb-4">Venue Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-findvenue/10 flex items-center justify-center mr-4">
                    <Users className="h-5 w-5 text-findvenue" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Capacity</p>
                    <p className="font-medium">{venue.capacity.min} - {venue.capacity.max} Guests</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-findvenue/10 flex items-center justify-center mr-4">
                    <Calendar className="h-5 w-5 text-findvenue" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Availability</p>
                    <p className="font-medium">
                      {venue.availability.length > 0 
                        ? venue.availability.join(', ') 
                        : 'Contact for availability'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-findvenue/10 flex items-center justify-center mr-4">
                    <Building className="h-5 w-5 text-findvenue" />
                  </div>
                  <div>
                    <p className="text-sm text-findvenue-text-muted">Location</p>
                    <p className="font-medium">{venue.address}</p>
                    <p className="text-sm">{venue.city}</p>
                  </div>
                </div>
                
                {venue.ownerInfo && (
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-findvenue/10 flex items-center justify-center mr-4">
                      <Info className="h-5 w-5 text-findvenue" />
                    </div>
                    <div>
                      <p className="text-sm text-findvenue-text-muted">Managed by</p>
                      <p className="font-medium">{venue.ownerInfo.name}</p>
                      <p className="text-xs text-findvenue-text-muted">
                        Typically responds in {venue.ownerInfo.responseTime}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="glass-card border-white/10 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Price</h3>
                <div className="text-2xl font-bold text-findvenue">
                  {venue.pricing.currency} {venue.pricing.startingPrice.toLocaleString()}
                </div>
              </div>
              
              <p className="text-sm text-findvenue-text-muted mb-4">
                {venue.pricing.pricePerPerson 
                  ? `${venue.pricing.currency} ${venue.pricing.pricePerPerson} per person`
                  : 'Starting price for venue rental'}
              </p>
              
              <Button className="w-full bg-findvenue hover:bg-findvenue-dark" onClick={() => document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Book Now
              </Button>
            </div>
          </div>
        </div>
        
        {/* Content Tabs */}
        <Tabs defaultValue="details" className="mb-12">
          <TabsList className="glass-card border-white/10 p-1">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-6">
            <div className="glass-card border-white/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">About This Venue</h3>
              <p className="text-findvenue-text-muted whitespace-pre-line">{venue.description}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="amenities" className="mt-6">
            <div className="glass-card border-white/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-6">Amenities & Features</h3>
              
              {venue.amenities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-findvenue/10 flex items-center justify-center mr-3">
                        {renderAmenityIcon(amenity)}
                      </div>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-findvenue-text-muted">No amenities information available</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="location" className="mt-6">
            <div className="glass-card border-white/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Location</h3>
              <p className="text-findvenue-text-muted mb-4">{venue.address}, {venue.city}</p>
              
              <div className="h-[400px] rounded-lg overflow-hidden">
                <VenueLocationMap 
                  name={venue.name} 
                  address={`${venue.address}, ${venue.city}`} 
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Booking Section */}
        <div id="booking-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">Book this Venue</h2>
            <BookingForm 
              venueId={venue.id} 
              venueName={venue.name} 
              pricePerHour={venue.pricing.startingPrice}
              ownerId={venue.ownerInfo?.userId || ''}
              ownerName={venue.ownerInfo?.name || ''}
            />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-6">Contact Venue Owner</h2>
            <ContactVenueOwner 
              venueId={venue.id}
              venueName={venue.name}
              ownerId={venue.ownerInfo?.userId || ''}
              ownerName={venue.ownerInfo?.name || ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueDetailsComponent;
