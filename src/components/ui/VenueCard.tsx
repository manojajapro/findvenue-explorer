
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Star, Users, CalendarDays, MapPin, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface VenueCardProps {
  venue: Venue;
  featured?: boolean;
  onFavoriteRemoved?: (venueId: string) => void;
  index?: number; // Add index for staggered animations
}

const VenueCard = ({ venue, featured = false, onFavoriteRemoved, index = 0 }: VenueCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, checkIsFavorite, toggleFavoriteVenue } = useAuth();
  const { isRTL } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(user ? checkIsFavorite(venue.id) : false);
  const imagesRef = useRef<string[]>([]);
  const [api, setApi] = useState<any>(null);
  
  // Prepare the images array, including the main image and gallery images
  useEffect(() => {
    const images: string[] = [];
    
    // Use gallery images if available
    if (venue.galleryImages && Array.isArray(venue.galleryImages) && venue.galleryImages.length > 0) {
      images.push(...venue.galleryImages);
    } 
    // Fallback to main image if no gallery images
    else if (venue.imageUrl) {
      images.push(venue.imageUrl);
    }
    
    // Remove duplicates
    const uniqueImages = [...new Set(images)];
    imagesRef.current = uniqueImages.length > 0 ? uniqueImages : [venue.imageUrl || ''];
  }, [venue.imageUrl, venue.galleryImages]);

  // Set up auto-scrolling for the carousel with different timing based on index
  useEffect(() => {
    if (!api) return;
    
    // Use different intervals for odd and even cards
    const interval = index % 2 === 0 ? 3500 : 4500;
    
    const autoplayInterval = setInterval(() => {
      api.scrollNext();
    }, interval);
    
    return () => clearInterval(autoplayInterval);
  }, [api, index]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Redirect to login if not logged in
      window.location.href = "/login";
      return;
    }
    
    try {
      await toggleFavoriteVenue(venue.id);
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);
      
      if (!newFavoriteState && onFavoriteRemoved) {
        onFavoriteRemoved(venue.id);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Extract primary category from category string or array
  const getPrimaryCategory = () => {
    if (!venue.category) return '';
    
    // Handle string representation of array
    if (typeof venue.category === 'string' && venue.category.startsWith('[')) {
      try {
        // Try to parse the string as JSON after replacing single quotes with double quotes
        const parsedCategories = JSON.parse(venue.category.replace(/'/g, '"'));
        return parsedCategories[0] || '';
      } catch (e) {
        // If parsing fails, use a substring approach
        const match = venue.category.match(/'([^']+)'/);
        return match ? match[1] : '';
      }
    }
    
    // If it's already an array, just take the first item
    if (Array.isArray(venue.category)) {
      return venue.category[0] || '';
    }
    
    return venue.category;
  };

  const primaryCategory = getPrimaryCategory();

  return (
    <Link to={`/venue/${venue.id}`} className="block h-full">
      <Card className={`overflow-hidden transition-all duration-500 h-full transform hover:scale-105 glass-card ${featured ? 'border-findvenue-gold/30' : 'border-white/10'}`}>
        <div className="relative overflow-hidden aspect-[4/3]">
          {!isLoaded && (
            <div className="absolute inset-0 bg-findvenue-surface animate-pulse" />
          )}
          
          <Carousel
            className="w-full h-full"
            opts={{
              align: "start",
              loop: true,
              direction: isRTL ? 'rtl' : 'ltr',
            }}
            setApi={setApi}
          >
            <CarouselContent className="h-full">
              {imagesRef.current.map((imgSrc, index) => (
                <CarouselItem key={index} className="h-full">
                  <img 
                    src={imgSrc} 
                    alt={`${venue.name} ${index}`}
                    className={`w-full h-full object-cover transition-transform duration-700 ${api ? 'hover:scale-110' : ''}`}
                    onLoad={() => {
                      if (index === 0) setIsLoaded(true);
                    }}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          
          {/* Badges and favorite button */}
          {featured && (
            <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} z-10`}>
              <Badge className="bg-findvenue-gold text-black font-medium px-2 py-1">
                {isRTL ? 'مميز' : 'Featured'}
              </Badge>
            </div>
          )}
          {venue.popular && (
            <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} z-10`}>
              <Badge className="bg-findvenue text-white font-medium px-2 py-1">
                {isRTL ? 'شائع' : 'Popular'}
              </Badge>
            </div>
          )}
          {primaryCategory && (
            <div className="absolute bottom-2 left-2 z-10">
              <Badge variant="outline" className="bg-black/40 backdrop-blur-sm border-white/10 text-white text-xs px-2 py-1">
                {primaryCategory}
              </Badge>
            </div>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm`}
              onClick={handleFavoriteClick}
            >
              <Heart 
                className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} 
              />
            </Button>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-1">{venue.name}</h3>
            <div className="flex items-center text-findvenue-gold">
              <Star className="w-4 h-4 fill-findvenue-gold text-findvenue-gold mr-1" />
              <span className="text-sm font-medium">{venue.rating}</span>
            </div>
          </div>
          
          <div className="text-findvenue-text-muted text-sm mb-1 flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{venue.city}</span>
          </div>
          
          <p className="text-sm text-findvenue-text-muted mb-4 line-clamp-2">
            {venue.description}
          </p>
          
          <div className="flex flex-wrap gap-3 text-xs text-findvenue-text-muted mt-auto">
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              <span>{isRTL ? 'حتى' : 'Up to'} {venue.capacity.max}</span>
            </div>
            <div className="flex items-center">
              <CalendarDays className="w-3 h-3 mr-1" />
              <span>{venue.availability?.length} {isRTL ? 'أيام/أسبوع' : 'days/week'}</span>
            </div>
            <div className="ml-auto font-semibold text-white">
              {venue.pricing.currency} {venue.pricing.startingPrice.toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default VenueCard;
