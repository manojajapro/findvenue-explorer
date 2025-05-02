import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  Share2,
  CreditCard,
  Sparkles,
  Check,
  X,
  Clock3,
  AccessibilityIcon,
  MessageCircle,
  Building2,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  X as CloseIcon,
  Image as ImageIcon
} from 'lucide-react';
import { VenueCard } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { Venue } from '@/hooks/useSupabaseVenues';
import VenueLocationMap from '@/components/map/VenueLocationMap';
import VenueBookingTabs from '@/components/venue/VenueBookingTabs';
import ContactVenueOwner from '@/components/venue/ContactVenueOwner';
import { useAuth } from '@/hooks/useAuth';
import VenueAIAssistants from '@/components/venue/VenueAIAssistants';
import VenueRating from '@/components/venue/VenueRating';
import { getVenueOwnerId, processCategoryNames } from '@/utils/venueHelpers';
import SocialShareButtons from '@/components/venue/SocialShareButtons';

const amenityIcons: Record<string, JSX.Element> = {
  'WiFi': <Wifi className="w-4 h-4" />,
  'Parking': <Car className="w-4 h-4" />,
  'Sound System': <Music className="w-4 h-4" />,
  'Catering': <UtensilsCrossed className="w-4 h-4" />,
  'Wheelchair Access': <AccessibilityIcon className="w-4 h-4" />,
};

const VenueDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [similarVenues, setSimilarVenues] = useState<Venue[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchVenueDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      
      try {
        const { data: venueData, error } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (venueData) {
          let ownerInfoData = undefined;
          if (venueData.owner_info) {
            const ownerInfo = venueData.owner_info as Record<string, any>;
            ownerInfoData = {
              name: ownerInfo.name as string,
              contact: ownerInfo.contact as string,
              responseTime: ownerInfo.response_time as string,
              user_id: ownerInfo.user_id as string
            };
          }
          
          let openingHoursData = undefined;
          if (venueData.opening_hours) {
            openingHoursData = venueData.opening_hours as Record<string, {open: string, close: string}>;
          }
          
          let rulesAndRegulationsData = undefined;
          try {
            if (venueData.rules_and_regulations) {
              rulesAndRegulationsData = typeof venueData.rules_and_regulations === 'string'
                ? JSON.parse(venueData.rules_and_regulations)
                : (venueData.rules_and_regulations as Array<{
                    category: string;
                    title: string;
                    description: string;
                  }>);
            }
          } catch (e) {
            console.error("Error parsing rules_and_regulations for venue", venueData.id, e);
          }
          
          const defaultImage = venueData.gallery_images && venueData.gallery_images.length > 0 
            ? venueData.gallery_images[0] 
            : '';
          
          const categories = processCategoryNames(venueData.category_name);
          
          const transformedVenue: Venue = {
            id: venueData.id,
            name: venueData.name,
            description: venueData.description || '',
            imageUrl: defaultImage,
            galleryImages: Array.isArray(venueData.gallery_images) ? venueData.gallery_images : [],
            address: venueData.address || '',
            city: venueData.city_name || '',
            cityId: venueData.city_id || '',
            category: categories.length > 0 ? categories[0] : '',
            categoryId: venueData.category_id || '',
            categories: categories,
            capacity: {
              min: venueData.min_capacity || 0,
              max: venueData.max_capacity || 0
            },
            pricing: {
              currency: venueData.currency || 'SAR',
              startingPrice: venueData.starting_price || 0,
              pricePerPerson: venueData.price_per_person || 0
            },
            amenities: Array.isArray(venueData.amenities) ? 
              venueData.amenities : 
              (typeof venueData.amenities === 'string' ? 
                venueData.amenities.split(',').map(a => a.trim()) : 
                []),
            rating: venueData.rating || 0,
            reviews: venueData.reviews_count || 0,
            featured: venueData.featured || false,
            popular: venueData.popular || false,
            availability: Array.isArray(venueData.availability) ? 
              venueData.availability : 
              (typeof venueData.availability === 'string' ? 
                venueData.availability.split(',').map(a => a.trim()) : 
                []),
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            parking: venueData.parking,
            wifi: venueData.wifi,
            accessibilityFeatures: venueData.accessibility_features || [],
            acceptedPaymentMethods: venueData.accepted_payment_methods || [],
            openingHours: openingHoursData,
            ownerInfo: ownerInfoData,
            additionalServices: venueData.additional_services || [],
            type: venueData.type || '',
            rulesAndRegulations: rulesAndRegulationsData
          };
          
          setVenue(transformedVenue);
          setActiveImage(transformedVenue.imageUrl);
          
          // Get similar venues based on shared categories
          const venueCategories = venueData.category_name || [];
          const { data: similarData, error: similarError } = await supabase
            .from('venues')
            .select('*')
            .overlaps('category_name', venueCategories)
            .neq('id', id)
            .order('featured', { ascending: false })
            .limit(8);
            
          if (similarError) throw similarError;
          
          if (similarData) {
            // Score venues by number of matching categories
            const scoredVenues = similarData.map(venue => {
              const venueCats = venue.category_name || [];
              const matchingCategories = venueCategories.filter(cat => 
                venueCats.includes(cat)
              ).length;
              return { ...venue, matchScore: matchingCategories };
            });

            // Sort by matching categories and featured status
            const sortedVenues = scoredVenues.sort((a, b) => {
              if (a.featured && !b.featured) return -1;
              if (!a.featured && b.featured) return 1;
              return b.matchScore - a.matchScore;
            });

            // Take top 4 most relevant venues
            const transformedSimilar = sortedVenues.slice(0, 4).map(venue => {
              const venueImage = venue.gallery_images && venue.gallery_images.length > 0 
                ? venue.gallery_images[0] 
                : '';

              let ownerInfoData = undefined;
              if (venue.owner_info) {
                const ownerInfo = venue.owner_info as Record<string, any>;
                ownerInfoData = {
                  name: ownerInfo.name as string,
                  contact: ownerInfo.contact as string,
                  responseTime: ownerInfo.response_time as string,
                  user_id: ownerInfo.user_id as string
                };
              }
              
              let openingHoursData = undefined;
              if (venue.opening_hours) {
                openingHoursData = venue.opening_hours as Record<string, {open: string, close: string}>;
              }
              
              let rulesAndRegulationsData = undefined;
              try {
                if (venue.rules_and_regulations) {
                  rulesAndRegulationsData = typeof venue.rules_and_regulations === 'string'
                    ? JSON.parse(venue.rules_and_regulations)
                    : venue.rules_and_regulations;
                }
              } catch (e) {
                console.error("Error parsing rules_and_regulations for venue", venue.id, e);
              }

              const categories = processCategoryNames(venue.category_name);
              
              return {
                id: venue.id,
                name: venue.name,
                description: venue.description || '',
                imageUrl: venueImage,
                galleryImages: Array.isArray(venue.gallery_images) ? venue.gallery_images : [],
                address: venue.address || '',
                city: venue.city_name || '',
                cityId: venue.city_id || '',
                category: categories.length > 0 ? categories[0] : '',
                categoryId: venue.category_id || '',
                categories: categories,
                capacity: {
                  min: venue.min_capacity || 0,
                  max: venue.max_capacity || 0
                },
                pricing: {
                  currency: venue.currency || 'SAR',
                  startingPrice: venue.starting_price || 0,
                  pricePerPerson: venue.price_per_person || 0
                },
                amenities: Array.isArray(venue.amenities) ? 
                  venue.amenities : 
                  (typeof venue.amenities === 'string' ? 
                    venue.amenities.split(',').map(a => a.trim()) : 
                    []),
                rating: venue.rating || 0,
                reviews: venue.reviews_count || 0,
                featured: venue.featured || false,
                popular: venue.popular || false,
                availability: Array.isArray(venue.availability) ? 
                  venue.availability : 
                  (typeof venue.availability === 'string' ? 
                    venue.availability.split(',').map(a => a.trim()) : 
                    []),
                latitude: venue.latitude,
                longitude: venue.longitude,
                parking: venue.parking,
                wifi: venue.wifi,
                accessibilityFeatures: venue.accessibility_features || [],
                acceptedPaymentMethods: venue.accepted_payment_methods || [],
                openingHours: openingHoursData,
                ownerInfo: ownerInfoData,
                additionalServices: venue.additional_services || [],
                type: venue.type || '',
                rulesAndRegulations: rulesAndRegulationsData
              } as Venue;
            });
            
            setSimilarVenues(transformedSimilar);
          }
        } else {
          navigate('/venues');
        }
      } catch (error) {
        console.error('Error fetching venue details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVenueDetails();
  }, [id, navigate]);
  
  const updateVenueRating = (newRating: number, newCount: number) => {
    if (venue) {
      setVenue({
        ...venue,
        rating: newRating,
        reviews: newCount
      });
    }
  };
  
  const renderOpeningHours = () => {
    if (!venue?.openingHours) return null;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10 mb-6">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <Clock3 className="w-4 h-4 mr-2 text-findvenue" />
            Opening Hours
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-2">
            {days.map(day => {
              const hours = venue.openingHours?.[day];
              return (
                <div key={day} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                  <span className="capitalize">{day}</span>
                  <span>{hours ? `${hours.open} - ${hours.close}` : 'Closed'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  const renderPaymentMethods = () => {
    if (!venue?.acceptedPaymentMethods?.length) return null;
    
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10 mb-6">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-findvenue" />
            Accepted Payment Methods
          </h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {venue.acceptedPaymentMethods.map((method, index) => (
              <Badge key={index} variant="secondary" className="bg-findvenue-surface/50">
                {method}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderAdditionalServices = () => {
    if (!venue?.additionalServices?.length) return null;
    
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10 mb-6">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-findvenue" />
            Additional Services
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venue.additionalServices.map((service, index) => (
              <div key={index} className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-findvenue" />
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderVenueType = () => {
    if (!venue?.type) return null;
    
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10 mb-6">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-findvenue" />
            Venue Type
          </h3>
        </div>
        <div className="p-4">
          <p>{venue.type}</p>
        </div>
      </div>
    );
  };
  
  const renderRulesAndRegulations = () => {
    if (!venue?.rulesAndRegulations || venue.rulesAndRegulations.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Rules & Regulations</h2>
        <div className="grid grid-cols-1 gap-4">
          {venue.rulesAndRegulations.map((rule, index) => (
            <div key={index} className="bg-findvenue-card-bg border border-white/10 rounded-lg p-4">
              <h3 className="font-medium mb-2">{rule.title}</h3>
              <div className="text-sm text-findvenue-text-muted mb-1">Category: {rule.category}</div>
              <p className="text-sm">{rule.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (venue?.galleryImages) {
      setCurrentImageIndex((prev) => 
        prev === venue.galleryImages.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (venue?.galleryImages) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? venue.galleryImages.length - 1 : prev - 1
      );
    }
  };
  
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
        <div className="mb-6">
          <Link to="/venues" className="flex items-center text-findvenue hover:text-findvenue-light transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to venues
          </Link>
        </div>
        
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <div className="relative rounded-lg overflow-hidden aspect-[16/9]">
                <img 
                  src={activeImage} 
                  alt={venue?.name} 
                  className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-105"
                />
                {venue?.featured && (
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
              {venue?.galleryImages?.slice(0, 1).map((img, index) => (
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
              {venue?.galleryImages && venue.galleryImages.length > 3 && (
                <div 
                  className="relative rounded-lg overflow-hidden aspect-square cursor-pointer group"
                  onClick={() => {
                    setShowGallery(true);
                    setCurrentImageIndex(3);
                  }}
                >
                  <img 
                    src={venue.galleryImages[3]} 
                    alt={`Gallery 4`} 
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm font-medium">
                        +{venue.galleryImages.length - 3} more
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Gallery Dialog */}
        <Dialog open={showGallery} onOpenChange={setShowGallery}>
          <DialogContent className="max-w-7xl w-full h-[90vh] p-6 bg-black/95">
            <div className="relative w-full h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Gallery</h2>
                {/* <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setShowGallery(false)}
                >
                  <CloseIcon className="h-6 w-6" />
                </Button> */}
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {venue?.galleryImages?.map((img, index) => (
                    <div 
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setActiveImage(img);
                      }}
                    >
                      <img 
                        src={img} 
                        alt={`Gallery ${index + 1}`} 
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                          activeImage === img ? 'ring-2 ring-findvenue' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          Image {index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Image Preview */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                  <img 
                    src={venue?.galleryImages?.[currentImageIndex]} 
                    alt={`Selected Gallery ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                    {currentImageIndex + 1} / {venue?.galleryImages?.length}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{venue?.name}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-findvenue" />
                <span>{venue?.address}, {venue?.city}</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1 text-findvenue" />
                <span>Capacity: {venue?.capacity.min}-{venue?.capacity.max} guests</span>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-findvenue-gold fill-findvenue-gold" />
                <span>{venue?.rating} ({venue?.reviews} reviews)</span>
              </div>
              {venue?.type && (
                <Badge className="bg-findvenue/20 text-findvenue border-0">
                  {venue.type}
                </Badge>
              )}
              {venue?.categories && venue.categories.map((cat, index) => (
                <Badge key={index} className="bg-findvenue/20 text-findvenue border-0">
                  {cat}
                </Badge>
              ))}
            </div>
            
            {/* Share this venue section - Added at the top of the venue details */}
            {/* <div className="mb-8 p-4 bg-findvenue-surface/10 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold mb-3 text-center">Share This Venue</h3>
              <SocialShareButtons 
                url={`${window.location.origin}/venue/${venue?.id}`}
                title={`Check out ${venue?.name} on FindVenue!`}
                description={venue?.description}
                imageUrl={venue?.galleryImages?.[0]}
                className="mt-2"
              />
            </div> */}
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">About this venue</h2>
              <p className="text-findvenue-text-muted mb-4">{venue?.description}</p>
              
              <div className="flex flex-wrap gap-4 mt-6">
                {venue?.wifi !== undefined && (
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${venue.wifi ? 'bg-findvenue/10 text-findvenue' : 'bg-findvenue-surface/50 text-findvenue-text-muted'}`}>
                      <Wifi className="w-4 h-4" />
                    </div>
                    <span className="flex items-center">
                      WiFi
                      {venue.wifi ? 
                        <Check className="w-4 h-4 ml-1 text-green-500" /> : 
                        <X className="w-4 h-4 ml-1 text-red-500" />
                      }
                    </span>
                  </div>
                )}
                
                {venue?.parking !== undefined && (
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${venue.parking ? 'bg-findvenue/10 text-findvenue' : 'bg-findvenue-surface/50 text-findvenue-text-muted'}`}>
                      <Car className="w-4 h-4" />
                    </div>
                    <span className="flex items-center">
                      Parking
                      {venue.parking ? 
                        <Check className="w-4 h-4 ml-1 text-green-500" /> : 
                        <X className="w-4 h-4 ml-1 text-red-500" />
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {venue?.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-findvenue/10 flex items-center justify-center mr-3">
                      {amenityIcons[amenity] || <Clock className="w-4 h-4 text-findvenue" />}
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
                
                {venue?.accessibilityFeatures?.map((feature, index) => (
                  <div key={`acc-${index}`} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-findvenue/10 flex items-center justify-center mr-3">
                      <AccessibilityIcon className="w-4 h-4 text-findvenue" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Availability</h2>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const isAvailable = venue?.availability?.includes(day);
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
            
            {renderRulesAndRegulations()}
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              {venue && (
                <VenueLocationMap 
                  name={venue.name}
                  address={venue.address || ''}
                  latitude={venue.latitude}
                  longitude={venue.longitude}
                />
              )}
            </div>
            
            <VenueAIAssistants venue={venue} />
            
            {venue?.additionalServices && venue.additionalServices.length > 0 && renderAdditionalServices()}
          </div>
          
          <div>
            <Card className="p-6 glass-card border-white/10 sticky top-24">
              <div className="mb-4 pb-4 border-b border-white/10">
                <div className="text-2xl font-bold mb-1">
                  {venue?.pricing.currency} {venue?.pricing.startingPrice.toLocaleString()}
                </div>
                <div className="text-findvenue-text-muted text-sm">
                  Starting price
                </div>
              </div>
              
              {venue?.pricing.pricePerPerson && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <span>Price per person</span>
                    <span>{venue?.pricing.currency} {venue?.pricing.pricePerPerson}</span>
                  </div>
                </div>
              )}
              
              {/* {venue?.type && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <span>Venue Type</span>
                    <span className="font-medium">{venue.type}</span>
                  </div>
                </div>
              )} */}
              
              {venue && (
                <VenueBookingTabs
                  venueId={venue.id}
                  venueName={venue.name}
                  pricePerHour={venue.pricing.startingPrice || 0}
                  minCapacity={venue.capacity.min}
                  maxCapacity={venue.capacity.max}
                  ownerId={getVenueOwnerId(venue) || ''}
                  ownerName={venue.ownerInfo?.name || 'Venue Host'}
                />
              )}
              
              {/* <div className="mt-4">
                {venue?.ownerInfo && (
                  <ContactVenueOwner 
                    venueId={venue.id}
                    venueName={venue.name}
                    ownerId={getVenueOwnerId(venue) || ''}
                    ownerName={venue.ownerInfo.name || 'Venue Host'}
                  />
                )}
              </div> */}
              
              <div className="mt-6">
                <VenueRating 
                  venueId={venue?.id || ''} 
                  initialRating={venue?.rating || 0} 
                  reviewsCount={venue?.reviews || 0}
                  onRatingUpdated={updateVenueRating}
                />
              </div>
              
              {venue?.acceptedPaymentMethods && venue.acceptedPaymentMethods.length > 0 && renderPaymentMethods()}
              
              {renderOpeningHours()}
              
              {renderVenueType()}
            </Card>
          </div>
        </div>
        
        {/* Social Media Sharing Section - Added before Similar Venues */}
        <div className="my-10 py-6 bg-findvenue-surface/5 rounded-lg border border-white/10">
          <h3 className="text-xl font-semibold text-center mb-4">Share This Venue</h3>
          <SocialShareButtons 
            url={`${window.location.origin}/venue/${venue?.id}`}
            title={`Check out ${venue?.name} on FindVenue!`}
            description={venue?.description}
            imageUrl={venue?.galleryImages?.[0]}
            className="mt-2"
          />
        </div>
        
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
