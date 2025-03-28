import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Search, ZoomIn, ArrowRight, Star, X } from 'lucide-react';
import L from 'leaflet';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

// Fix for marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for highlighted venue
const highlightedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Featured venue icon 
const featuredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  venues: Venue[];
  isLoading: boolean;
  highlightedVenueId?: string;
}

// Component to update map view when props change
const MapUpdater = ({ 
  venues, 
  searchTerm,
  highlightedVenueId
}: { 
  venues: Venue[]; 
  searchTerm?: string;
  highlightedVenueId?: string;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (venues.length > 0) {
      // Get venues with coordinates
      const venuesWithCoords = venues.filter(
        venue => venue.latitude && venue.longitude
      );
      
      if (venuesWithCoords.length > 0) {
        // If there's a highlighted venue, center on it
        if (highlightedVenueId) {
          const highlightedVenue = venuesWithCoords.find(v => v.id === highlightedVenueId);
          if (highlightedVenue && highlightedVenue.latitude && highlightedVenue.longitude) {
            map.setView(
              [highlightedVenue.latitude, highlightedVenue.longitude], 
              14, 
              { animate: true, duration: 1 }
            );
            return;
          }
        }
        
        // Otherwise, fit bounds to all venues
        const bounds = L.latLngBounds(
          venuesWithCoords.map(venue => [
            venue.latitude || 24.774265, 
            venue.longitude || 46.738586
          ])
        );
        
        // Fit map to these bounds
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } else {
        // Default to Saudi Arabia if no venues have coordinates
        map.setView([24.774265, 46.738586], 5);
      }
    }
  }, [venues, map, searchTerm, highlightedVenueId]);
  
  return null;
};

const MapSearch = ({ 
  onSearch 
}: { 
  onSearch: (term: string) => void 
}) => {
  const [searchText, setSearchText] = useState('');
  const [searchParams] = useSearchParams();
  const debouncedSearchTerm = useDebounce(searchText, 500);
  
  useEffect(() => {
    // Initialize search from URL parameters
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchText(searchFromUrl);
    }
  }, [searchParams]);
  
  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchText);
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative mb-4">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
      <Input
        type="text"
        placeholder="Search venues on map..."
        className="pl-10 bg-white/5 backdrop-blur-md w-full py-2"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      {searchText && (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
          onClick={() => {
            setSearchText('');
            onSearch('');
          }}
        >
          <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
        </button>
      )}
    </form>
  );
};

const MapView = ({ venues, isLoading, highlightedVenueId }: MapViewProps) => {
  const navigate = useNavigate();
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  
  // Filter venues with valid coordinates
  const venuesWithCoordinates = filteredVenues.filter(
    venue => venue.latitude && venue.longitude
  );
  
  // Default center on Saudi Arabia
  const defaultCenter: [number, number] = [24.774265, 46.738586];
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const handleSearch = useCallback((term: string) => {
    setMapSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredVenues(venues);
      return;
    }
    
    const searchLower = term.toLowerCase();
    const results = venues.filter(venue => 
      venue.name.toLowerCase().includes(searchLower) || 
      venue.description.toLowerCase().includes(searchLower) ||
      venue.address.toLowerCase().includes(searchLower) ||
      venue.city.toLowerCase().includes(searchLower) ||
      venue.category.toLowerCase().includes(searchLower) ||
      venue.amenities.some(amenity => 
        amenity.toLowerCase().includes(searchLower)
      )
    );
    
    setFilteredVenues(results);
  }, [venues]);
  
  // Update filtered venues when main venues list changes
  useEffect(() => {
    if (!mapSearchTerm) {
      setFilteredVenues(venues);
    } else {
      handleSearch(mapSearchTerm);
    }
  }, [venues, mapSearchTerm, handleSearch]);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute top-4 left-4 right-4 z-[1000] rounded-md overflow-hidden shadow-lg">
        <MapSearch onSearch={handleSearch} />
      </div>
      
      {venuesWithCoordinates.length === 0 ? (
        <div className="h-full flex items-center justify-center bg-findvenue-surface/50 p-6 text-center">
          <div>
            <MapPin className="h-12 w-12 mx-auto mb-4 text-findvenue-text-muted opacity-50" />
            <h3 className="text-xl font-medium mb-2">No Venues Found</h3>
            <p className="text-findvenue-text-muted">
              We couldn't find any venues matching your criteria with map coordinates.
              Try adjusting your search filters or switching to list view.
            </p>
          </div>
        </div>
      ) : (
        <MapContainer 
          center={defaultCenter} 
          zoom={5} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          className="z-10"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapUpdater 
            venues={venuesWithCoordinates} 
            searchTerm={mapSearchTerm} 
            highlightedVenueId={highlightedVenueId || activeVenue}
          />
          
          {venuesWithCoordinates.map((venue) => (
            <Marker 
              key={venue.id}
              position={[venue.latitude || 0, venue.longitude || 0]}
              icon={
                venue.id === highlightedVenueId || venue.id === activeVenue 
                  ? highlightedIcon 
                  : venue.featured 
                    ? featuredIcon
                    : new L.Icon.Default()
              }
              eventHandlers={{
                click: () => setActiveVenue(venue.id),
              }}
            >
              <Popup minWidth={240} maxWidth={320} className="custom-popup">
                <div className="text-black">
                  <div className="mb-2 relative">
                    <img 
                      src={venue.imageUrl} 
                      alt={venue.name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                    {venue.featured && (
                      <Badge className="absolute top-2 right-2 bg-findvenue-gold text-black">
                        Featured
                      </Badge>
                    )}
                    <h3 className="font-bold text-base">{venue.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <p className="truncate">{venue.address}, {venue.city}</p>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {venue.category && (
                        <Badge variant="outline" className="text-xs py-0">
                          {venue.category}
                        </Badge>
                      )}
                      {venue.rating > 0 && (
                        <Badge className="bg-amber-500 text-black text-xs py-0 flex items-center">
                          <Star className="h-3 w-3 mr-1" /> {venue.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold">{venue.pricing.startingPrice} {venue.pricing.currency}</span>
                      {venue.pricing.pricePerPerson && <span> / person</span>}
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-findvenue hover:bg-findvenue-dark text-xs px-3 py-1.5 h-auto flex items-center"
                      onClick={() => handleVenueClick(venue.id)}
                    >
                      View Details
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
      
      {mapSearchTerm && venuesWithCoordinates.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-findvenue-surface/90 backdrop-blur-md p-3 rounded-md shadow-lg">
          <p className="text-sm text-findvenue-text">
            Showing {venuesWithCoordinates.length} {venuesWithCoordinates.length === 1 ? 'result' : 'results'} for "{mapSearchTerm}"
          </p>
        </div>
      )}
      
      <TooltipProvider>
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue-surface"
                onClick={() => handleSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Clear search</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue-surface"
                onClick={() => {
                  // TODO: Implement zoom in functionality
                  // This would need to use the map reference
                }}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom to all venues</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default MapView;
