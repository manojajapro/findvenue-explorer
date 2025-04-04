
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseVenues, Venue } from '@/hooks/useSupabaseVenues';
import { CalendarDays, MapPin, Users, Star, Clock, Wifi, Car, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import VenueBookingTabs from '@/components/venue/VenueBookingTabs';
import ContactVenueOwner from '@/components/venue/ContactVenueOwner';
import { FacebookIcon, TwitterIcon, InstagramIcon, LinkedinIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';

const VenueDetails = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { venues, isLoading, error } = useSupabaseVenues();
  const [venue, setVenue] = useState<Venue | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (venueId && venues.length > 0) {
      const foundVenue = venues.find(venue => venue.id === venueId);
      setVenue(foundVenue || null);
    }
  }, [venueId, venues]);
  
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

  // Check if user is the venue owner
  const isOwner = user?.id === venue.ownerInfo?.user_id;
  
  return (
    <div className="container mx-auto p-4">
      <div className="md:flex md:gap-8">
        {/* Image Gallery */}
        <div className="md:w-2/3">
          <img src={venue.imageUrl} alt={venue.name} className="w-full rounded-lg object-cover h-64 md:h-96" />
          <ScrollArea className="relative w-full overflow-x-auto mt-4">
            <div className="flex gap-2">
              {venue.galleryImages && venue.galleryImages.map((image, index) => (
                <img key={index} src={image} alt={`${venue.name} Gallery ${index + 1}`} className="w-32 h-20 rounded-md object-cover" />
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Venue Details */}
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
          
          {/* Amenities Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {venue.amenities && venue.amenities.map((amenity, index) => (
              <Badge key={index}>{amenity}</Badge>
            ))}
            {venue.parking && <Badge>Parking</Badge>}
            {venue.wifi && <Badge>WiFi</Badge>}
            {venue.accessibilityFeatures && venue.accessibilityFeatures.length > 0 && <Badge>Accessible</Badge>}
            {venue.acceptedPaymentMethods && venue.acceptedPaymentMethods.length > 0 && <Badge>Payment Options</Badge>}
          </div>
          
          {/* Pricing */}
          <div className="mb-4">
            <h4 className="text-lg font-semibold">Pricing</h4>
            <p className="text-gray-700">
              Starting from <span className="font-bold">{venue.pricing.currency} {venue.pricing.startingPrice}</span>
              {venue.pricing.pricePerPerson && <span> + {venue.pricing.currency} {venue.pricing.pricePerPerson} per person</span>}
              {venue.pricing.hourlyRate && <span> / {venue.pricing.currency} {venue.pricing.hourlyRate} per hour</span>}
            </p>
          </div>
          
          {/* Contact Venue Owner - Only show if user is not the owner */}
          {venue.ownerInfo && !isOwner && (
            <ContactVenueOwner 
              venueId={venue.id}
              venueName={venue.name}
              ownerId={venue.ownerInfo.user_id}
              ownerName={venue.ownerInfo.name}
            />
          )}
        </div>
      </div>
      
      <Separator className="my-4" />
      
      {/* Venue Description */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold">About This Venue</h4>
        <p className="text-gray-700">{venue.description}</p>
      </div>
      
      <Separator className="my-4" />
      
      {/* Venue Booking Tabs - Only show if user is not the owner */}
      {!isOwner && (
        <VenueBookingTabs 
          venueId={venue.id}
          venueName={venue.name}
          pricePerHour={venue.pricing.hourlyRate}
          minCapacity={venue.capacity.min}
          maxCapacity={venue.capacity.max}
          ownerId={venue.ownerInfo?.user_id || ''}
          ownerName={venue.ownerInfo?.name || ''}
        />
      )}
      
      {/* Owner Information */}
      {venue.ownerInfo && (
        <>
          <Separator className="my-4" />
          <div className="mb-4">
            <h4 className="text-lg font-semibold">Venue Host</h4>
            <p className="text-gray-700">Contact: {venue.ownerInfo.contact}</p>
            <p className="text-gray-700">Response Time: {venue.ownerInfo.responseTime}</p>
            {venue.ownerInfo.socialLinks && (
              <div className="mt-4 flex space-x-3">
                {venue.ownerInfo.socialLinks.facebook && (
                  <a href={venue.ownerInfo.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                )}
                {venue.ownerInfo.socialLinks.twitter && (
                  <a href={venue.ownerInfo.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    <TwitterIcon className="h-5 w-5" />
                  </a>
                )}
                {venue.ownerInfo.socialLinks.instagram && (
                  <a href={venue.ownerInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300">
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                )}
                {venue.ownerInfo.socialLinks.linkedin && (
                  <a href={venue.ownerInfo.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                    <LinkedinIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Voice Assistant for the venue */}
      <VenueSpecificVoiceAssistant venue={venue} />
    </div>
  );
}

export default VenueDetails;
