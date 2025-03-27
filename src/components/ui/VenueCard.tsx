
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Star, Users, CalendarDays, MapPin, Tag, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface VenueCardProps {
  venue: Venue;
  featured?: boolean;
  onFavoriteRemoved?: (venueId: string) => void;
}

const VenueCard = ({ venue, featured = false, onFavoriteRemoved }: VenueCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, checkIsFavorite, toggleFavoriteVenue } = useAuth();
  const [isFavorite, setIsFavorite] = useState(user ? checkIsFavorite(venue.id) : false);

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

  return (
    <Link to={`/venue/${venue.id}`} className="block h-full">
      <Card className={`overflow-hidden transition-all duration-500 h-full transform hover-scale glass-card ${featured ? 'border-findvenue-gold/30' : 'border-white/10'}`}>
        <div className="relative overflow-hidden aspect-[4/3]">
          {!isLoaded && (
            <div className="absolute inset-0 bg-findvenue-surface animate-pulse" />
          )}
          <img 
            src={venue.imageUrl} 
            alt={venue.name}
            className={`w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
            onLoad={() => setIsLoaded(true)}
          />
          {featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-findvenue-gold text-black font-medium px-2 py-1">
                Featured
              </Badge>
            </div>
          )}
          {venue.popular && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-findvenue text-white font-medium px-2 py-1">
                Popular
              </Badge>
            </div>
          )}
          {venue.category && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="outline" className="bg-black/40 backdrop-blur-sm border-white/10 text-white text-xs px-2 py-1">
                {venue.category}
              </Badge>
            </div>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm"
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
          
          <div className="text-findvenue-text-muted text-sm mb-3 flex items-center">
            <Tag className="w-3 h-3 mr-1" />
            <span>{venue.category}</span>
          </div>
          
          <p className="text-sm text-findvenue-text-muted mb-4 line-clamp-2">
            {venue.description}
          </p>
          
          <div className="flex flex-wrap gap-3 text-xs text-findvenue-text-muted mt-auto">
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              <span>Up to {venue.capacity.max}</span>
            </div>
            <div className="flex items-center">
              <CalendarDays className="w-3 h-3 mr-1" />
              <span>{venue.availability?.length} days/week</span>
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
