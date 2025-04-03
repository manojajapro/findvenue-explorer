
import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle, useJsApiLoader } from '@react-google-maps/api';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import EnhancedMapSearch from './EnhancedMapSearch';
import MapControls from './MapControls';

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
  onFilteredVenuesChange?: (venues: Venue[]) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const DEFAULT_LOCATION = {
  lat: 24.774265,
  lng: 46.738586
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }]
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212835" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }]
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }]
  }
];

const MapView = ({ venues, isLoading, highlightedVenueId, onFilteredVenuesChange }: MapViewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mapSearchTerm, setMapSearchTerm] = useState(searchParams.get('search') || '');
  const [isCompactControls, setIsCompactControls] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isRadiusActive, setIsRadiusActive] = useState(false);
  const [radiusInKm, setRadiusInKm] = useState(1.0);
  const [venuesInRadius, setVenuesInRadius] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isSettingManualLocation, setIsSettingManualLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string>("Custom Location");
  const [mapCursor, setMapCursor] = useState<string>('default');
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: 'google-map-script'
  });

  const venuesWithCoordinates = filteredVenues.filter(
    venue => venue.latitude && venue.longitude
  );

  // When filteredVenues or venuesInRadius changes, notify parent component
  useEffect(() => {
    const displayVenues = isRadiusActive ? venuesInRadius : venuesWithCoordinates;
    if (onFilteredVenuesChange) {
      onFilteredVenuesChange(displayVenues);
    }
  }, [venuesInRadius, venuesWithCoordinates, isRadiusActive, onFilteredVenuesChange]);
  
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam && searchParam !== mapSearchTerm) {
      setMapSearchTerm(searchParam);
      handleSearch(searchParam);
    }
  }, [searchParams]);
  
  useEffect(() => {
    if (searchParams.get('mapTools') === 'radius') {
      setIsRadiusActive(true);
      setUserLocation(DEFAULT_LOCATION);
      
      setTimeout(() => {
        toast.info("Click anywhere on the map to set your location for radius search", {
          duration: 5000,
          id: "map-instruction",
        });
      }, 500);
    }
  }, [searchParams]);
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const handleSearch = useCallback((term: string) => {
    setMapSearchTerm(term);
    
    const newParams = new URLSearchParams(searchParams);
    if (term.trim()) {
      newParams.set('search', term.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
    
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
  }, [venues, searchParams, setSearchParams]);
  
  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    const newLocation = { lat, lng };
    setUserLocation(newLocation);
    setLocationAddress(address);
    setIsRadiusActive(true);
    
    if (mapRef.current) {
      mapRef.current.panTo(newLocation);
      mapRef.current.setZoom(14);
    }
    
    toast.success(`Location set to: ${address}`);
  }, []);
  
  const handleManualLocationSetting = useCallback(() => {
    setIsSettingManualLocation(true);
    setMapCursor('crosshair');
    
    if (!userLocation) {
      setUserLocation(DEFAULT_LOCATION);
      setLocationAddress("Default Location (Riyadh)");
    }
    
    toast.info("Click on the map to set your location", {
      description: "Click anywhere on the map to set your location for radius search",
      position: "top-center",
      duration: 5000
    });
    
    setIsRadiusActive(true);
  }, [userLocation]);
  
  const handleCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      toast.info("Getting your current location...");
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          setUserLocation(newLocation);
          setIsRadiusActive(true);
          
          if (window.google && window.google.maps) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: newLocation }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setLocationAddress(results[0].formatted_address);
                toast.success(`Location set to: ${results[0].formatted_address}`);
              } else {
                setLocationAddress("Your Current Location");
                toast.success("Current location detected");
              }
            });
          } else {
            setLocationAddress("Your Current Location");
            toast.success("Current location detected");
          }
          
          if (mapRef.current) {
            mapRef.current.panTo(newLocation);
            mapRef.current.setZoom(14);
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          toast.error("Could not access your location. Please allow location access in your browser settings or try setting location manually.");
        }
      );
    } else {
      toast.error("Your browser doesn't support geolocation");
    }
  }, []);
  
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (isSettingManualLocation && e.latLng) {
      const newLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setUserLocation(newLocation);
      setLocationAddress("Custom Location");
      setIsRadiusActive(true);
      setIsSettingManualLocation(false);
      setMapCursor('default');
      
      if (window.google && window.google.maps) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setLocationAddress(results[0].formatted_address);
            toast.success(`Location set to: ${results[0].formatted_address}`);
          } else {
            toast.success("Custom location set successfully");
          }
        });
      } else {
        toast.success("Custom location set successfully");
      }
      
      if (mapRef.current) {
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(15);
      }
    }
  }, [isSettingManualLocation]);
  
  const handleMapMove = useCallback((e: google.maps.MapMouseEvent) => {
    if (isSettingManualLocation && mapRef.current && e.latLng) {
      const previewLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setUserLocation(previewLocation);
    }
  }, [isSettingManualLocation]);
  
  const resetToDefaultLocation = useCallback(() => {
    setUserLocation(DEFAULT_LOCATION);
    setLocationAddress("Default Location (Riyadh)");
    setIsRadiusActive(true);
    
    if (mapRef.current) {
      mapRef.current.panTo(DEFAULT_LOCATION);
      mapRef.current.setZoom(14);
    }
    
    toast.success("Reset to default location (Riyadh)");
  }, []);
  
  const toggleRadiusSearch = useCallback(() => {
    if (isRadiusActive) {
      setIsRadiusActive(false);
    } else {
      if (!userLocation) {
        setUserLocation(DEFAULT_LOCATION);
        setLocationAddress("Default Location (Riyadh)");
      }
      
      setIsRadiusActive(true);
      
      if (mapRef.current && userLocation) {
        mapRef.current.panTo(userLocation);
        mapRef.current.setZoom(14);
      }
    }
  }, [isRadiusActive, userLocation]);
  
  // Calculate venues in radius
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
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update filtered venues when main venues prop changes
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
    
    mapRef.current.fitBounds(bounds, 50);
    
    if (displayVenues.length === 1 || (displayVenues.length === 0 && userLocation)) {
      setTimeout(() => {
        if (mapRef.current && mapRef.current.getZoom() > 15) {
          mapRef.current.setZoom(15);
        }
      }, 100);
    }
  }, [venuesInRadius, venuesWithCoordinates, isRadiusActive, userLocation]);
  
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setTimeout(() => {
      fitBoundsToMarkers();
      setMapLoaded(true);
    }, 100);
  }, [fitBoundsToMarkers]);
  
  const onMarkerClick = useCallback((venue: Venue) => {
    setActiveVenue(venue.id);
    setSelectedVenue(venue);
  }, []);
  
  const getAppliedFilters = useCallback(() => {
    const filters: string[] = [];
    
    if (searchParams.has('search')) {
      filters.push(`Search: ${searchParams.get('search')}`);
    }
    
    if (searchParams.has('categoryId')) {
      const categoryId = searchParams.get('categoryId');
      filters.push(`Category: ${categoryId}`);
    }
    
    if (searchParams.has('cityId')) {
      const cityId = searchParams.get('cityId');
      filters.push(`City: ${cityId}`);
    }
    
    return filters;
  }, [searchParams]);
  
  const appliedFilters = getAppliedFilters();
  
  const handleClearFilter = useCallback((filter: string) => {
    const filterType = filter.split(':')[0].trim().toLowerCase();
    const newParams = new URLSearchParams(searchParams);
    
    if (filterType === 'search') {
      newParams.delete('search');
      setMapSearchTerm('');
    } else if (filterType === 'category') {
      newParams.delete('categoryId');
    } else if (filterType === 'city') {
      newParams.delete('cityId');
    }
    
    setSearchParams(newParams, { replace: true });
    
    if (filterType === 'search') {
      handleSearch('');
    }
  }, [searchParams, handleSearch, setSearchParams]);
  
  const handleClearSearch = useCallback(() => {
    setMapSearchTerm('');
    
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
    
    handleSearch('');
  }, [handleSearch, searchParams, setSearchParams]);
  
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
    <div className={`h-full flex flex-col relative ${mapLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="absolute top-4 left-4 right-4 z-[1000] animate-fade-in">
        <EnhancedMapSearch 
          onSearch={handleSearch}
          onLocationSelect={handleLocationSelect}
          onRadiusChange={handleRadiusChange}
          onManualLocation={handleManualLocationSetting}
          onCurrentLocation={handleCurrentLocation}
          venueCount={displayVenues.length}
          radiusInKm={radiusInKm}
          isRadiusActive={isRadiusActive}
          searchText={mapSearchTerm}
          setSearchText={setMapSearchTerm}
          appliedFilters={appliedFilters}
          onClearFilter={handleClearFilter}
        />
      </div>
      
      {isSettingManualLocation && (
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-findvenue-surface/90 backdrop-blur-md p-3 rounded-md text-center border border-white/10 animate-scale-in">
          <p className="text-sm font-medium">Click anywhere on the map to set your location</p>
          <p className="text-xs text-findvenue-text-muted mb-2">Move your cursor to preview location</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 border-white/10"
            onClick={() => {
              setIsSettingManualLocation(false);
              setMapCursor('default');
              if (!userLocation) {
                setUserLocation(DEFAULT_LOCATION);
                setLocationAddress("Default Location (Riyadh)");
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
        <div className="h-full flex items-center justify-center bg-findvenue-surface/50 p-6 text-center animate-fade-in">
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
                onClick={() => setRadiusInKm(Math.min(radiusInKm + 1, 10))}
              >
                Increase radius to {Math.min(radiusInKm + 1, 10).toFixed(1)} km
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
          onMouseMove={handleMapMove}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: DARK_MAP_STYLE
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: -1, 
              cursor: mapCursor 
            }} 
          />
          
          {userLocation && isRadiusActive && (
            <>
              <Circle 
                center={userLocation} 
                radius={radiusInKm * 1000} 
                options={{
                  fillColor: '#10B981',
                  fillOpacity: 0.15,
                  strokeColor: '#10B981',
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
                animation={google.maps.Animation.DROP}
              >
                {selectedVenue === null && (
                  <InfoWindow
                    position={userLocation}
                    onCloseClick={() => setSelectedVenue(null)}
                  >
                    <div className="text-black text-sm p-1">
                      <h3 className="font-bold text-base mb-1">{locationAddress}</h3>
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
                  : google.maps.Animation.DROP
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
                        <Badge className="absolute top-2 right-2 bg-amber-400 text-black">
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
                        className="bg-findvenue hover:bg-findvenue-dark text-xs px-3 py-1 h-auto flex items-center hover-scale"
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
      
      <MapControls
        isCompactControls={isCompactControls}
        isRadiusActive={isRadiusActive}
        toggleRadiusSearch={toggleRadiusSearch}
        handleManualLocationSetting={handleManualLocationSetting}
        handleClearSearch={handleClearSearch}
        fitBoundsToMarkers={fitBoundsToMarkers}
        resetToDefaultLocation={resetToDefaultLocation}
      />
    </div>
  );
};

export default MapView;
