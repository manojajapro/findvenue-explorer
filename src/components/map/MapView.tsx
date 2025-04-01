
import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Search, ZoomIn, ArrowRight, Star, X, Filter, Locate, Ruler, Navigation } from 'lucide-react';
import L from 'leaflet';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { Slider } from '@/components/ui/slider';

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

// Location marker icon
const locationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
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
  highlightedVenueId,
  userLocation,
  radiusInKm
}: { 
  venues: Venue[];
  searchTerm?: string;
  highlightedVenueId?: string;
  userLocation?: [number, number];
  radiusInKm: number;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 14, { animate: true, duration: 1 });
      return;
    }
    
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
  }, [venues, map, searchTerm, highlightedVenueId, userLocation]);
  
  return null;
};

// Calculation function for distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

const MapSearch = ({ 
  onSearch,
  venueCount,
  onRadiusChange,
  radiusInKm,
  isRadiusActive
}: { 
  onSearch: (term: string) => void;
  venueCount: number;
  onRadiusChange: (value: number) => void;
  radiusInKm: number;
  isRadiusActive: boolean;
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
    <div className="bg-findvenue-surface/90 backdrop-blur-md rounded-md overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium flex items-center">
          <MapPin className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
          {venueCount > 0 ? `${venueCount} venues on map` : 'No venues found'}
        </span>
        {searchText && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setSearchText('');
              onSearch('');
            }}
          >
            Clear <X className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
        <Input
          type="text"
          placeholder="Search venues on map..."
          className="pl-10 pr-8 py-2 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
      
      {isRadiusActive && (
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center mb-1">
            <Ruler className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
            <span className="text-xs font-medium">Radius search: {radiusInKm.toFixed(1)} km</span>
          </div>
          <Slider
            value={[radiusInKm]}
            min={0.1}
            max={5}
            step={0.1}
            onValueChange={(values) => onRadiusChange(values[0])}
            className="py-1"
          />
        </div>
      )}
    </div>
  );
};

const MapView = ({ venues, isLoading, highlightedVenueId }: MapViewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [isCompactControls, setIsCompactControls] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined);
  const [isRadiusActive, setIsRadiusActive] = useState(false);
  const [radiusInKm, setRadiusInKm] = useState(1.0);
  const [venuesInRadius, setVenuesInRadius] = useState<Venue[]>([]);
  
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
  
  // Get user's location
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setIsRadiusActive(true);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);
  
  // Filter venues by radius
  useEffect(() => {
    if (userLocation && isRadiusActive) {
      const [userLat, userLng] = userLocation;
      
      const inRadius = venuesWithCoordinates.filter(venue => {
        if (!venue.latitude || !venue.longitude) return false;
        
        const distance = calculateDistance(
          userLat, 
          userLng, 
          venue.latitude, 
          venue.longitude
        );
        
        return distance <= radiusInKm;
      });
      
      setVenuesInRadius(inRadius);
    } else {
      setVenuesInRadius(venuesWithCoordinates);
    }
  }, [userLocation, isRadiusActive, radiusInKm, venuesWithCoordinates]);
  
  // Compact view toggle based on map size
  useEffect(() => {
    const handleResize = () => {
      setIsCompactControls(window.innerWidth < 768);
    };
    
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update filtered venues when main venues list changes
  useEffect(() => {
    if (!mapSearchTerm) {
      setFilteredVenues(venues);
    } else {
      handleSearch(mapSearchTerm);
    }
  }, [venues, mapSearchTerm, handleSearch]);
  
  // Handle radius change
  const handleRadiusChange = useCallback((value: number) => {
    setRadiusInKm(value);
  }, []);
  
  // Toggle radius search
  const toggleRadiusSearch = useCallback(() => {
    if (isRadiusActive) {
      setIsRadiusActive(false);
    } else {
      if (!userLocation) {
        getUserLocation();
      } else {
        setIsRadiusActive(true);
      }
    }
  }, [isRadiusActive, userLocation, getUserLocation]);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue"></div>
      </div>
    );
  }
  
  const displayVenues = isRadiusActive ? venuesInRadius : venuesWithCoordinates;
  
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <MapSearch 
          onSearch={handleSearch} 
          venueCount={displayVenues.length}
          onRadiusChange={handleRadiusChange}
          radiusInKm={radiusInKm}
          isRadiusActive={isRadiusActive}
        />
      </div>
      
      {displayVenues.length === 0 ? (
        <div className="h-full flex items-center justify-center bg-findvenue-surface/50 p-6 text-center">
          <div>
            <MapPin className="h-12 w-12 mx-auto mb-4 text-findvenue-text-muted opacity-50" />
            <h3 className="text-xl font-medium mb-2">No Venues Found</h3>
            <p className="text-findvenue-text-muted">
              {isRadiusActive 
                ? `We couldn't find any venues within ${radiusInKm.toFixed(1)} km of your location.` 
                : "We couldn't find any venues matching your criteria with map coordinates."}
            </p>
            {isRadiusActive && (
              <Button 
                variant="outline" 
                className="mt-3"
                onClick={() => setRadiusInKm(Math.min(radiusInKm + 1, 5))}
              >
                <Ruler className="h-4 w-4 mr-2" />
                Increase radius to {Math.min(radiusInKm + 1, 5).toFixed(1)} km
              </Button>
            )}
          </div>
        </div>
      ) : (
        <MapContainer 
          center={defaultCenter} 
          zoom={5} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          className="z-10"
          ref={mapRef}
          preferCanvas={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapUpdater 
            venues={venuesWithCoordinates} 
            searchTerm={mapSearchTerm} 
            highlightedVenueId={highlightedVenueId || activeVenue}
            userLocation={userLocation}
            radiusInKm={radiusInKm}
          />
          
          {userLocation && isRadiusActive && (
            <>
              <Circle 
                center={userLocation} 
                radius={radiusInKm * 1000} 
                pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.1 }}
              />
              <Marker
                position={userLocation}
                icon={locationIcon}
              >
                <Popup>
                  <div>
                    <h3 className="font-bold text-base mb-1">Your Location</h3>
                    <p className="text-xs text-gray-600">
                      Showing venues within {radiusInKm.toFixed(1)} km
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
          
          {displayVenues.map((venue) => (
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
              <Popup minWidth={240} maxWidth={300} className="custom-popup">
                <div className="text-black">
                  <div className="relative">
                    <img 
                      src={venue.imageUrl} 
                      alt={venue.name}
                      className="w-full h-28 object-cover rounded-md"
                    />
                    {venue.featured && (
                      <Badge className="absolute top-2 right-2 bg-findvenue-gold text-black">
                        Featured
                      </Badge>
                    )}
                    {isRadiusActive && userLocation && venue.latitude && venue.longitude && (
                      <Badge className="absolute top-2 left-2 bg-findvenue text-white">
                        {calculateDistance(
                          userLocation[0], 
                          userLocation[1], 
                          venue.latitude, 
                          venue.longitude
                        ).toFixed(1)} km
                      </Badge>
                    )}
                  </div>
                  <div className="py-2">
                    <h3 className="font-bold text-base truncate">{venue.name}</h3>
                    <div className="flex items-center text-xs text-gray-600 mb-1">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <p className="truncate">{venue.address}, {venue.city}</p>
                    </div>
                    <div className="flex gap-1 mb-2 flex-wrap">
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
                  <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                    <div>
                      <span className="font-semibold">{venue.pricing.startingPrice} {venue.pricing.currency}</span>
                      {venue.pricing.pricePerPerson && <span> / person</span>}
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-findvenue hover:bg-findvenue-dark text-xs px-3 py-1 h-auto flex items-center"
                      onClick={() => handleVenueClick(venue.id)}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
      
      {mapSearchTerm && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-findvenue-surface/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-lg text-xs flex items-center">
          <Filter className="h-3 w-3 mr-1.5 text-findvenue" />
          <span>Filtered: "{mapSearchTerm}"</span>
          <button onClick={() => handleSearch('')} className="ml-2 text-findvenue hover:text-findvenue-light">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      <TooltipProvider>
        <div className={`absolute ${isCompactControls ? 'bottom-4 right-4' : 'top-20 right-4'} z-[1000] flex ${isCompactControls ? 'flex-row' : 'flex-col'} gap-2`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className={`h-8 w-8 ${isRadiusActive ? 'bg-findvenue text-white' : 'bg-findvenue-surface/80'} backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md`}
                onClick={toggleRadiusSearch}
              >
                <Locate className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>{isRadiusActive ? 'Disable radius search' : 'Enable radius search'}</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                onClick={() => handleSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>Clear filters</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                onClick={() => {
                  if (mapRef.current) {
                    if (userLocation && isRadiusActive) {
                      mapRef.current.setView(userLocation, 14);
                    } else if (venuesWithCoordinates.length > 0) {
                      const bounds = L.latLngBounds(
                        venuesWithCoordinates.map(venue => [
                          venue.latitude || 24.774265, 
                          venue.longitude || 46.738586
                        ])
                      );
                      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
                    }
                  }
                }}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>Zoom to fit</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default MapView;
