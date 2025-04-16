import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVenueData } from '@/hooks/useVenueData';
import { CalendarDays, MapPin, Users, Star, Clock, Wifi, Car, CreditCard, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import VenueBookingTabs from '@/components/venue/VenueBookingTabs';
import VenueBookingInquiry from '@/components/venue/VenueBookingInquiry';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import VenueAIAssistants from '@/components/venue/VenueAIAssistants';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import VenueLocationMap from '@/components/map/VenueLocationMap';

const VenueDetails = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { venue, isLoading, error } = useVenueData();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <Skeleton className="h-[500px] w-full rounded-lg" />
          </div>
          <div className="md:col-span-4 grid grid-rows-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="mt-6">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-full mb-1" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
  }
  
  if (!venue) {
    return <div className="container mx-auto p-4">Venue not found.</div>;
  }

  const ownerInfo = venue.ownerInfo || null;
  const ownerId = ownerInfo?.user_id || '';
  const ownerName = ownerInfo?.name || '';
  
  const isOwner = user?.id === ownerId;
  
  const categoryNames = Array.isArray(venue.categoryNames) ? venue.categoryNames : 
                       (venue.category && typeof venue.category === 'string' ? 
                         venue.category.split(',').map(c => c.trim()) : 
                         []);
  
  const mainImage = venue.galleryImages && venue.galleryImages.length > 0 
    ? venue.galleryImages[0] 
    : 'https://placehold.co/600x400?text=No+Image';
  
  const handleImageClick = (image: string) => {
    setSelectedImage(image);
  };
  
  const shareVenue = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: venue.name,
          text: `Check out this venue: ${venue.name}`,
          url: window.location.href,
        });
        toast({
          title: "Shared successfully",
          description: "Venue link has been shared",
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Venue link has been copied to clipboard",
      });
    }
  };
  
  const hasEnoughImages = venue.galleryImages && venue.galleryImages.length >= 4;

  const venueLatitude = typeof venue.latitude === 'number' ? venue.latitude : 
                       (venue.latitude ? parseFloat(String(venue.latitude)) : undefined);
  const venueLongitude = typeof venue.longitude === 'number' ? venue.longitude : 
                       (venue.longitude ? parseFloat(String(venue.longitude)) : undefined);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 h-[650px] mb-8 rounded-xl overflow-hidden shadow-xl">
        <div 
          className="md:col-span-8 h-full relative overflow-hidden group cursor-pointer" 
          onClick={() => venue.galleryImages?.[0] && handleImageClick(venue.galleryImages[0])}
        >
          <img 
            src={venue.galleryImages?.[0] || mainImage} 
            alt={venue.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
          {venue?.featured && (
            <Badge className="absolute top-4 left-4 bg-amber-500 text-white">
              Featured
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              shareVenue();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </Button>
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
            <h1 className="text-3xl font-bold text-white">{venue.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center text-white/90">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{venue.address}, {venue.city}</span>
              </div>
              <div className="flex items-center text-white/90">
                <Star className="h-4 w-4 mr-1 text-yellow-400" fill="#eab308" />
                <span className="text-sm">{venue.rating} ({venue.reviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-4 grid grid-rows-4 gap-2 h-full">
          {venue.galleryImages?.slice(1, 5).map((img, index) => (
            <div 
              key={index}
              className="relative overflow-hidden cursor-pointer group"
              onClick={() => handleImageClick(img)}
            >
              <img 
                src={img} 
                alt={`${venue.name} Gallery ${index+1}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
              {index === 3 && venue.galleryImages && venue.galleryImages.length > 5 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 backdrop-blur-sm">
                  <span className="text-white text-xl font-medium">
                    +{venue.galleryImages.length - 5} more
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button className="mb-6 bg-findvenue hover:bg-findvenue/90 text-white">
            View All Photos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {venue.galleryImages && venue.galleryImages.map((image, index) => (
              <img 
                key={index} 
                src={image} 
                alt={`${venue.name} Gallery ${index + 1}`} 
                className="w-full h-64 object-cover rounded cursor-pointer"
                onClick={() => handleImageClick(image)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative">
              <img 
                src={selectedImage} 
                alt={venue.name} 
                className="w-full max-h-[80vh] object-contain"
              />
              <Button 
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 rounded-full"
                onClick={() => setSelectedImage(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="md:flex md:gap-8">
        <div className="md:w-2/3 space-y-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2 items-center mb-6 bg-findvenue-surface/5 p-4 rounded-lg border border-white/10">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-findvenue" />
              <div>
                <p className="text-sm text-findvenue-text-muted">Capacity</p>
                <p className="font-medium">{venue.capacity.min} - {venue.capacity.max} guests</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-findvenue" />
              <div>
                <p className="text-sm text-findvenue-text-muted">Hours</p>
                <p className="font-medium">09:00 - 22:00</p>
              </div>
            </div>
            {venue.parking && (
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-findvenue" />
                <div>
                  <p className="text-sm text-findvenue-text-muted">Parking</p>
                  <p className="font-medium">Available</p>
                </div>
              </div>
            )}
            {venue.wifi && (
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-findvenue" />
                <div>
                  <p className="text-sm text-findvenue-text-muted">WiFi</p>
                  <p className="font-medium">Available</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categoryNames.length > 0 ? (
                categoryNames.map((category, index) => (
                  <Badge 
                    key={index} 
                    className="py-1.5 px-3 bg-indigo-100/10 hover:bg-indigo-100/20 text-indigo-500 border border-indigo-500/30 rounded-full"
                  >
                    {category}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400">No categories specified</span>
              )}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold">About This Venue</h4>
            <p className="text-gray-700 mt-2 leading-relaxed">{venue.description}</p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold mb-3">Amenities</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {venue.amenities && venue.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-findvenue-surface/10 rounded-md">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-findvenue/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-findvenue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{amenity}</span>
                </div>
              ))}
              {venue.accessibilityFeatures && venue.accessibilityFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-findvenue-surface/10 rounded-md">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-findvenue/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-findvenue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold mb-3">Location</h4>
            <VenueLocationMap 
              name={venue.name}
              address={venue.address || ''}
              latitude={venueLatitude}
              longitude={venueLongitude}
            />
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold mb-3">Rules and Regulations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="glass-card p-4 rounded-lg bg-findvenue-surface/10 backdrop-blur-sm border border-white/10">
                <h5 className="font-medium mb-2">General Rules</h5>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>No smoking indoors</li>
                  <li>No pets allowed</li>
                  <li>No outside food or beverages</li>
                  <li>All decorations must be approved by management</li>
                  <li>Noise levels must be kept reasonable after 10 PM</li>
                </ul>
              </div>
              <div className="glass-card p-4 rounded-lg bg-findvenue-surface/10 backdrop-blur-sm border border-white/10">
                <h5 className="font-medium mb-2">Booking Terms</h5>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>50% advance payment required to confirm booking</li>
                  <li>Cancellations within 48 hours are non-refundable</li>
                  <li>Venue must be vacated at agreed time</li>
                  <li>Damage to property will incur additional charges</li>
                  <li>COVID safety protocols must be followed</li>
                </ul>
              </div>
            </div>
          </div>
          
          <VenueAIAssistants venue={venue} />
        </div>
        
        <div className="md:w-1/3 mt-6 md:mt-0">
          <VenueBookingTabs 
            venueId={venue.id}
            venueName={venue.name}
            pricePerHour={venue.pricing.hourlyRate}
            minCapacity={venue.capacity.min}
            maxCapacity={venue.capacity.max}
            ownerId={ownerId}
            ownerName={ownerName}
          />
        </div>
      </div>
    </div>
  );
};

export default VenueDetails;
