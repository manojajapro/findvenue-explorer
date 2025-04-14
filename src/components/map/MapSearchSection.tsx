
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useGeocode } from '@/hooks/useGeocode';
import { toast } from 'sonner';

interface MapSearchSectionProps {
  onLocationSelected?: (location: string) => void;
  variant?: 'default' | 'minimal';
}

const MapSearchSection = ({ 
  onLocationSelected,
  variant = 'default'
}: MapSearchSectionProps) => {
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { geocodePinCode } = useGeocode();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location.trim()) {
      toast.error("Please enter a location to search");
      return;
    }
    
    setIsSearching(true);
    
    try {
      if (onLocationSelected) {
        // If we're on the home page, use the callback to update the UI there
        onLocationSelected(location.trim());
        setIsSearching(false);
        return;
      }
      
      const params = new URLSearchParams();
      params.set('search', location.trim());
      params.set('view', 'map');
      
      // Try to geocode the location to center the map
      try {
        const coordinates = await geocodePinCode(location.trim());
        if (coordinates) {
          params.set('lat', coordinates.lat.toString());
          params.set('lng', coordinates.lng.toString());
          params.set('zoom', '14');
        }
      } catch (error) {
        console.error("Error geocoding:", error);
        // Continue with search even if geocoding fails
      }
      
      navigate(`/venues?${params.toString()}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error during search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <form onSubmit={handleSearch} className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
          <Input
            type="text"
            placeholder="Search venues by location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 bg-findvenue-surface/50 border-white/10"
          />
          {location && (
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setLocation('')}
            >
              <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
            </button>
          )}
        </div>
        <Button 
          type="submit" 
          className="bg-findvenue hover:bg-findvenue-dark"
          disabled={isSearching}
        >
          {isSearching ? (
            <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Search
        </Button>
      </form>
    );
  }

  return (
    <Card className="bg-findvenue-card-bg/80 backdrop-blur-xl p-4 shadow-lg border border-white/10 rounded-lg max-w-3xl mx-auto">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
          <Input
            type="text"
            placeholder="Search venues by location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 bg-findvenue-surface/50 border-white/10"
          />
          {location && (
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setLocation('')}
            >
              <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
            </button>
          )}
        </div>
        <Button 
          type="submit" 
          className="bg-findvenue hover:bg-findvenue-dark"
          disabled={isSearching}
        >
          {isSearching ? (
            <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Search Map
        </Button>
      </form>
    </Card>
  );
};

export default MapSearchSection;
