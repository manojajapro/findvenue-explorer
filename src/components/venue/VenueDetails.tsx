import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVenueData } from '@/hooks/useVenueData';
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
import VenueAIAssistants from '@/components/venue/VenueAIAssistants';

interface VenueOwnerInfo {
  name: string;
  contact: string;
  responseTime: string;
  user_id: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

const VenueDetails = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { venue, isLoading, error } = useVenueData();
  const { user } = useAuth();
  
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

  const isOwner = user?.id === venue.ownerInfo?.user_id;
  
  // Function to format category names with proper spacing
  const formatCategoryNames = (categories: string[] | null) => {
    if (!categories || categories.length === 0) return [];
    
    // Split each category name by capital letter and join with a space
    return categories.map(category => {
      // Split camelCase or concatenated category names
      return category.replace(/([A-Z])/g, ' $1').trim();
    });
  };
  
  // Get the main image from gallery images
  const mainImage = venue.galleryImages && venue.galleryImages.length > 0 
    ? venue.galleryImages[0] 
    : 'https://placehold.co/600x400?text=No+Image';
  
  return (
    <div className="container mx-auto p-4">
      <div className="md:flex md:gap-8">
        <div className="md:w-2/3 space-y-4">
          <div className="grid grid-cols-12 gap-4 h-96">
            <div className="col-span-8 h-full">
              <img src={mainImage} alt={venue.name} className="w-full h-full rounded-lg object-cover" />
            </div>
            
            <div className="col-span-4 grid grid-rows-2 gap-4 h-full">
              {venue.galleryImages && venue.galleryImages.slice(1, 3).map((image, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden">
                  <img src={image} alt={`${venue.name} Gallery ${index + 1}`} className="w-full h-full object-cover" />
                  {index === 1 && venue.galleryImages && venue.galleryImages.length > 3 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white text-lg font-medium">+{venue.galleryImages.length - 3} photos</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-2 pb-2">
            {venue.galleryImages && venue.galleryImages.map((image, index) => (
              <img 
                key={index} 
                src={image} 
                alt={`${venue.name} Gallery ${index + 1}`} 
                className="w-20 h-20 rounded-md object-cover flex-shrink-0"
              />
            ))}
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
              {formatCategoryNames(venue.category ? [venue.category] : null).map((category, index) => (
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
          
          {venue.ownerInfo && !isOwner && user && (
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
      
      <VenueBookingTabs 
        venueId={venue.id}
        venueName={venue.name}
        pricePerHour={venue.pricing.hourlyRate}
        minCapacity={venue.capacity.min}
        maxCapacity={venue.capacity.max}
        ownerId={venue.ownerInfo?.user_id || ''}
        ownerName={venue.ownerInfo?.name || ''}
      />
      
      {venue.ownerInfo && (
        <>
          <Separator className="my-4" />
          <div className="mb-4 bg-findvenue-surface/10 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="relative">
                <div className="w-12 h-12 bg-findvenue rounded-full flex items-center justify-center text-white text-lg font-bold mr-3">
                  {venue.ownerInfo.name.charAt(0)}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold">{venue.ownerInfo.name}</h4>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-findvenue-text-muted mb-1">Contact</p>
                <p className="text-gray-700">{venue.ownerInfo.contact}</p>
              </div>
              <div>
                <p className="text-sm text-findvenue-text-muted mb-1">Response Time</p>
                <p className="text-gray-700">{venue.ownerInfo.responseTime}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-findvenue-text-muted mb-1">Response Rate</p>
                <p className="text-gray-700">100%</p>
              </div>
            </div>
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

      <VenueAIAssistants venue={venue} />
    </div>
  );
};

export default VenueDetails;
