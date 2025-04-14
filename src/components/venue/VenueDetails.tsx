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

  // Get owner info from venue data
  const ownerInfo = venue.ownerInfo || null;
  const ownerId = ownerInfo?.user_id || '';
  const ownerName = ownerInfo?.name || '';
  
  // Check if current user is the owner
  const isOwner = user?.id === ownerId;
  
  const categoryNames = venue.categoryNames || [];
  
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
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Venue link has been copied to clipboard",
      });
    }
  };
  
  // Helper function to determine if we have enough images for gallery layout
  const hasEnoughImages = venue.galleryImages && venue.galleryImages.length >= 4;

  return (
    <div className="container mx-auto p-4">
      {/* Modern Gallery Layout - Matches the reference image */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 h-[550px] mb-6">
        {/* Main large image - takes up more space */}
        <div 
          className="md:col-span-8 h-full relative rounded-lg overflow-hidden group cursor-pointer" 
          onClick={() => venue.galleryImages?.[0] && handleImageClick(venue.galleryImages[0])}
        >
          <img 
            src={venue.galleryImages?.[0] || mainImage} 
            alt={venue.name} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
          {venue?.featured && (
            <Badge className="absolute top-4 left-4 bg-amber-500 text-white">
              Featured
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 bg-black/30 text-white hover:bg-black/50"
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
        </div>
        
        {/* Right column with additional images stacked vertically */}
        <div className="md:col-span-4 grid grid-rows-4 gap-2 h-full">
          {venue.galleryImages?.slice(1, 5).map((img, index) => (
            <div 
              key={index}
              className="relative rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => handleImageClick(img)}
            >
              <img 
                src={img} 
                alt={`${venue.name} Gallery ${index+1}`} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
              {index === 3 && venue.galleryImages && venue.galleryImages.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300">
                  <span className="text-white text-lg font-medium">
                    +{venue.galleryImages.length - 5} more
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Image Gallery Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="mb-6 bg-findvenue text-white hover:bg-findvenue-dark">
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
      
      {/* Selected Image Dialog */}
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

      {/* Main content and sidebar layout */}
      <div className="md:flex md:gap-8">
        <div className="md:w-2/3 space-y-4">
          <h1 className="text-2xl font-semibold mb-2">{venue.name}</h1>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">{venue.address}, {venue.city}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-600">{venue.rating} ({venue.reviews} reviews)</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Capacity: {venue.capacity.min} - {venue.capacity.max}</span>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categoryNames.map((category, index) => (
                <Badge key={index} className="bg-findvenue/20 text-findvenue hover:bg-findvenue/30">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {venue.amenities && venue.amenities.map((amenity, index) => (
              <Badge key={index}>{amenity}</Badge>
            ))}
            {venue.parking && <Badge>Parking</Badge>}
            {venue.wifi && <Badge>WiFi</Badge>}
            {venue.accessibilityFeatures && venue.accessibilityFeatures.length > 0 && <Badge>Accessible</Badge>}
            {venue.acceptedPaymentMethods && venue.acceptedPaymentMethods.length > 0 && <Badge>Payment Options</Badge>}
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold">About This Venue</h4>
            <p className="text-gray-700">{venue.description}</p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold">Rules and Regulations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-findvenue-surface/10 p-4 rounded-lg">
                <h5 className="font-medium mb-2">General Rules</h5>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>No smoking indoors</li>
                  <li>No pets allowed</li>
                  <li>No outside food or beverages</li>
                  <li>All decorations must be approved by management</li>
                  <li>Noise levels must be kept reasonable after 10 PM</li>
                </ul>
              </div>
              <div className="bg-findvenue-surface/10 p-4 rounded-lg">
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
          {/* Use the VenueBookingTabs component but with simpler initial view */}
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
