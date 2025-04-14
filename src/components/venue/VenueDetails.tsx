
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

const VenueDetails = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { venue, isLoading, error } = useVenueData();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
          </div>
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
  
  return (
    <div className="container mx-auto p-4">
      <div className="md:flex md:gap-8">
        <div className="md:w-2/3 space-y-4">
          {/* New Gallery Layout - Similar to the reference image */}
          <div className="grid grid-cols-12 gap-2 h-[600px]">
            {/* Main large image - takes up 2/3 of space */}
            <div className="col-span-8 h-full relative rounded-lg overflow-hidden group cursor-pointer" 
                onClick={() => handleImageClick(venue.galleryImages[0])}>
              <img 
                src={venue.galleryImages[0]} 
                alt={venue.name} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
            </div>
            
            {/* Right column with additional images */}
            <div className="col-span-4 grid grid-rows-3 gap-2 h-full">
              {/* Top right image */}
              {venue.galleryImages && venue.galleryImages[1] && (
                <div className="relative rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => handleImageClick(venue.galleryImages[1])}>
                  <img 
                    src={venue.galleryImages[1]} 
                    alt={`${venue.name} Gallery 1`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                </div>
              )}
              
              {/* Middle right image */}
              {venue.galleryImages && venue.galleryImages[2] && (
                <div className="relative rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => handleImageClick(venue.galleryImages[2])}>
                  <img 
                    src={venue.galleryImages[2]} 
                    alt={`${venue.name} Gallery 2`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                </div>
              )}
              
              {/* Bottom right image with overlay for more photos */}
              {venue.galleryImages && venue.galleryImages[3] && (
                <div className="relative rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => handleImageClick(venue.galleryImages[3])}>
                  <img 
                    src={venue.galleryImages[3]} 
                    alt={`${venue.name} Gallery 3`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  {venue.galleryImages.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300">
                      <span className="text-white text-lg font-medium">
                        See all<br/>{venue.galleryImages.length} photos
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Image Gallery Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="px-4 py-2 bg-findvenue text-white rounded-md hover:bg-findvenue-dark">
                View All Photos
              </button>
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
          
          <div className="flex overflow-x-auto gap-2 pb-2">
            {venue.galleryImages && venue.galleryImages.slice(0, 6).map((image, index) => (
              <img 
                key={index} 
                src={image} 
                alt={`${venue.name} Gallery ${index + 1}`} 
                className="w-20 h-20 rounded-md object-cover flex-shrink-0 cursor-pointer"
                onClick={() => handleImageClick(image)}
              />
            ))}
            {venue.galleryImages && venue.galleryImages.length > 6 && (
              <div className="w-20 h-20 rounded-md bg-findvenue flex items-center justify-center flex-shrink-0 cursor-pointer text-white">
                +{venue.galleryImages.length - 6}
              </div>
            )}
          </div>
        </div>
        
        <div className="md:w-1/3">
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
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">
              {venue.availability && venue.availability.length > 0 ? 'Available' : 'Not Available'}
            </span>
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
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold">Pricing</h4>
            <p className="text-gray-700">
              {venue.pricing.pricePerPerson ? (
                <>
                  <span className="font-bold">{venue.pricing.currency} {venue.pricing.pricePerPerson}</span> per person
                </>
              ) : (
                <>
                  Starting from <span className="font-bold">{venue.pricing.currency} {venue.pricing.startingPrice}</span>
                  {venue.pricing.hourlyRate && <span> / {venue.pricing.currency} {venue.pricing.hourlyRate} per hour</span>}
                </>
              )}
            </p>
          </div>
        </div>
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
      
      <Separator className="my-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {!isOwner && (
            <VenueBookingInquiry 
              venueId={venue.id}
              venueName={venue.name}
              ownerInfo={ownerInfo}
              maxCapacity={venue.capacity.max}
            />
          )}
        </div>
        
        <div>
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
      
      <VenueAIAssistants venue={venue} />
    </div>
  );
};

export default VenueDetails;
