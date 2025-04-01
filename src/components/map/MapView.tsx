import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle, useJsApiLoader } from '@react-google-maps/api';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Search, ZoomIn, ArrowRight, Star, X, Filter, Locate, Ruler, Navigation, MapIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

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

interface MapViewProps {
  venues: Venue[];
  isLoading: boolean;
  highlightedVenueId?: string;
}

const MapSearch = ({ 
  onSearch,
  venueCount,
  onRadiusChange,
  radiusInKm,
  isRadiusActive,
  onManualLocation
}: { 
  onSearch: (term: string) => void;
  venueCount: number;
  onRadiusChange: (value: number) => void;
  radiusInKm: number;
  isRadiusActive: boolean;
  onManualLocation: () => void;
}) => {
  const [searchText, setSearchText] = useState('');
  const [searchParams] = useSearchParams();
  const debouncedSearchTerm = useDebounce(searchText, 500);
  
  useEffect(() => {
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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <Ruler className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
              <span className="text-xs font-medium">Radius search: {radiusInKm.toFixed(1)} km</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={onManualLocation}
            >
              <MapIcon className="h-3 w-3 mr-1" />
              Set Location
            </Button>
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

const containerStyle = {
  width: '100%',
  height: '100%'
};

const DEFAULT_LOCATION = {
  lat: 24.774265,
  lng: 46.738586
};

const MapView = ({ venues, isLoading, highlightedVenueId }: MapViewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [isCompactControls, setIsCompactControls] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | undefined>(DEFAULT_LOCATION);
  const [isRadiusActive, setIsRadiusActive] = useState(false);
  const [radiusInKm, setRadiusInKm] = useState(1.0);
  const [venuesInRadius, setVenuesInRadius] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isSettingManualLocation, setIsSettingManualLocation] = useState(false);
  const [searchParams] = useSearchParams();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: 'google-map-script'
  });

  const venuesWithCoordinates = filteredVenues.filter(
    venue => venue.latitude && venue.longitude
  );
  
  useEffect(() => {
    // Check for mapTools parameter
    if (searchParams.get('mapTools') === 'radius') {
      setIsRadiusActive(true);
      if (!userLocation) {
        getUserLocation();
      }
    }
    
    // Show a toast when the page loads to instruct users
    toast.info("Click anywhere on the map to set your location for radius search", {
      duration: 5000,
      id: "map-instruction",
    });
  }, [searchParams]);
  
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
  
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({
            lat: latitude,
            lng: longitude
          });
          setIsRadiusActive(true);
          
          // Center map on user location
          if (mapRef.current) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
            mapRef.current.setZoom(14);
          }
          
          toast.success("Location detected successfully");
        },
        (error) => {
          console.error("Error getting user location:", error);
          toast.error("Could not get your location. Using default location (11461).");
          
          // Use default location if geolocation fails
          setUserLocation(DEFAULT_LOCATION);
          setIsRadiusActive(true);
          
          // Center map on default location
          if (mapRef.current) {
            mapRef.current.panTo(DEFAULT_LOCATION);
            mapRef.current.setZoom(14);
          }
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      toast.error("Your browser doesn't support location services. Using default location (11461).");
      
      // Use default location if geolocation is not supported
      setUserLocation(DEFAULT_LOCATION);
      setIsRadiusActive(true);
      
      // Center map on default location
      if (mapRef.current) {
        mapRef.current.panTo(DEFAULT_LOCATION);
        mapRef.current.setZoom(14);
      }
    }
  }, []);
  
  const handleManualLocationSetting = useCallback(() => {
    setIsSettingManualLocation(true);
    toast.info("Click on the map to set your location", {
      description: "Click anywhere on the map to set your location for radius search",
      position: "top-center",
      duration: 5000
    });
  }, []);
  
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (isSettingManualLocation && e.latLng) {
      const newLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setUserLocation(newLocation);
      setIsRadiusActive(true);
      setIsSettingManualLocation(false);
      
      toast.success("Custom location set successfully");
      
      // If map ref exists, center on the new location and zoom in
      if (mapRef.current) {
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(14);
      }
    }
  }, [isSettingManualLocation]);
  
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
  
  useEffect(() => {
    if (userLocation && isRadiusActive) {
      const inRadius = venuesWithCoordinates.filter(venue => {
        if (!venue.latitude || !venue.longitude) return false;
        
        const distance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
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
  
  useEffect(() => {
    const handleResize = () => {
      setIsCompactControls(window.innerWidth < 768);
    };
    
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (!mapSearchTerm) {
      setFilteredVenues(venues);
    } else {
      handleSearch(mapSearchTerm);
    }
  }, [venues, mapSearchTerm, handleSearch]);
  
  const handleRadiusChange = useCallback((value: number) => {
    setRadiusInKm(value);
  }, []);
  
  const fitBoundsToMarkers = useCallback(() => {
    if (!mapRef.current) return;
    
    const bounds = new google.maps.LatLngBounds();
    const displayVenues = isRadiusActive ? venuesInRadius : venuesWithCoordinates;
    
    if (displayVenues.length === 0) return;
    
    displayVenues.forEach(venue => {
      if (venue.latitude && venue.longitude) {
        bounds.extend({ lat: venue.latitude, lng: venue.longitude });
      }
    });
    
    if (userLocation && isRadiusActive) {
      bounds.extend(userLocation);
    }
    
    mapRef.current.fitBounds(bounds, 50); // 50px padding
  }, [venuesInRadius, venuesWithCoordinates, isRadiusActive, userLocation]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setTimeout(fitBoundsToMarkers, 100);
  }, [fitBoundsToMarkers]);
  
  const onMarkerClick = useCallback((venue: Venue) => {
    setActiveVenue(venue.id);
    setSelectedVenue(venue);
  }, []);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue"></div>
      </div>
    );
  }
  
  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <p>Loading Google Maps...</p>
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <p>Error loading Google Maps: {loadError.message}</p>
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
          onManualLocation={handleManualLocationSetting}
        />
      </div>
      
      {isSettingManualLocation && (
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-findvenue-surface/90 backdrop-blur-md p-3 rounded-md text-center">
          <p className="text-sm font-medium">Click anywhere on the map to set your location</p>
          <p className="text-xs text-findvenue-text-muted mb-2">Default location: Pin code 11461 (Riyadh)</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 border-white/10"
            onClick={() => {
              setIsSettingManualLocation(false);
              // Set to default location if user cancels
              if (!userLocation) {
                setUserLocation(DEFAULT_LOCATION);
                if (mapRef.current) {
                  mapRef.current.panTo(DEFAULT_LOCATION);
                  mapRef.current.setZoom(14);
                }
              }
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      
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
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation || DEFAULT_LOCATION}
          zoom={14}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: "all",
                elementType: "labels.text",
                stylers: [{ lightness: 20 }]
              }
            ]
          }}
        >
          {userLocation && isRadiusActive && (
            <>
              <Circle 
                center={userLocation} 
                radius={radiusInKm * 1000} 
                options={{
                  fillColor: '#38bdf8',
                  fillOpacity: 0.1,
                  strokeColor: '#38bdf8',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
              <Marker
                position={userLocation}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
              >
                {selectedVenue === null && (
                  <InfoWindow
                    position={userLocation}
                    onCloseClick={() => setSelectedVenue(null)}
                  >
                    <div className="text-black text-sm p-1">
                      <h3 className="font-bold text-base mb-1">Your Location</h3>
                      <p className="text-xs text-gray-600">
                        Showing venues within {radiusInKm.toFixed(1)} km
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            </>
          )}
          
          {displayVenues.map((venue) => (
            <Marker 
              key={venue.id}
              position={{ lat: venue.latitude || 0, lng: venue.longitude || 0 }}
              onClick={() => onMarkerClick(venue)}
              icon={{
                url: venue.id === highlightedVenueId || venue.id === activeVenue 
                  ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  : venue.featured 
                    ? 'https://maps.google.com/mapfiles/ms/icons/gold-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: new google.maps.Size(30, 30)
              }}
              animation={
                venue.id === highlightedVenueId || venue.id === activeVenue
                  ? google.maps.Animation.BOUNCE
                  : undefined
              }
            >
              {selectedVenue && selectedVenue.id === venue.id && (
                <InfoWindow
                  position={{ lat: venue.latitude || 0, lng: venue.longitude || 0 }}
                  onCloseClick={() => setSelectedVenue(null)}
                >
                  <div className="text-black max-w-[240px]">
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
                            userLocation.lat, 
                            userLocation.lng, 
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVenueClick(venue.id);
                        }}
                      >
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}
        </GoogleMap>
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
      
      {isSettingManualLocation && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[1000] bg-findvenue-surface/80 backdrop-blur-sm px-4 py-3 rounded-md shadow-lg flex items-center justify-between">
          <span className="text-sm font-medium">Click on map to set location</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4 border-white/10"
            onClick={() => setIsSettingManualLocation(false)}
          >
            Cancel
          </Button>
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
          
          {isRadiusActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                  onClick={handleManualLocationSetting}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
                <p>Set location manually</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                onClick={() => {
                  // Reset to default location
                  setUserLocation(DEFAULT_LOCATION);
                  setIsRadiusActive(true);
                  if (mapRef.current) {
                    mapRef.current.panTo(DEFAULT_LOCATION);
                    mapRef.current.setZoom(14);
                  }
                  toast.success("Reset to default location (11461)");
                }}
              >
                <Navigation className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>Use default location (11461)</p>
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
                onClick={fitBoundsToMarkers}
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
