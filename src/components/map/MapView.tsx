import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle, useJsApiLoader } from '@react-google-maps/api';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import MapControls from './MapControls';
import { useDebounce } from '@/hooks/useDebounce';

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

const MapView = memo(({ venues, isLoading, highlightedVenueId, onFilteredVenuesChange }: MapViewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mapSearchTerm, setMapSearchTerm] = useState(searchParams.get('search') || '');
  const debouncedSearchTerm = useDebounce(mapSearchTerm, 800);
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
  const [memoizedVenues, setMemoizedVenues] = useState<Venue[]>([]);
  const [isDraggingCircle, setIsDraggingCircle] = useState(false);
  const searchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const isUpdatingSearchParams = useRef(false);
  const isSearchInProgress = useRef(false);
  const lastSearchQuery = useRef<string>('');

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: 'google-map-script'
  });

  useEffect(() => {
    if (JSON.stringify(venues) !== JSON.stringify(memoizedVenues)) {
      setMemoizedVenues(venues);
    }
  }, [venues]);

  const venuesWithCoordinates = filteredVenues.filter(
    venue => venue.latitude && venue.longitude
  );

  useEffect(() => {
    const displayVenues = isRadiusActive ? venuesInRadius : venuesWithCoordinates;
    if (onFilteredVenuesChange) {
      onFilteredVenuesChange(displayVenues);
    }
  }, [venuesInRadius, venuesWithCoordinates, isRadiusActive, onFilteredVenuesChange]);
  
  useEffect(() => {
    if (isInitialLoadRef.current || isUpdatingSearchParams.current) {
      isUpdatingSearchParams.current = false;
      return;
    }

    const searchParam = searchParams.get('search');
    
    if (debouncedSearchTerm !== searchParam && debouncedSearchTerm !== lastSearchQuery.current) {
      lastSearchQuery.current = debouncedSearchTerm;
      
      if (searchUpdateTimeoutRef.current) {
        clearTimeout(searchUpdateTimeoutRef.current);
      }
      
      searchUpdateTimeoutRef.current = setTimeout(() => {
        isUpdatingSearchParams.current = true;
        
        const newParams = new URLSearchParams(searchParams);
        if (debouncedSearchTerm.trim()) {
          newParams.set('search', debouncedSearchTerm.trim());
        } else {
          newParams.delete('search');
        }
        
        setSearchParams(newParams, { replace: true });
      }, 250);
    }
    
    if (searchParam && searchParam !== mapSearchTerm) {
      setMapSearchTerm(searchParam);
      handleSearch(searchParam);
    }
  }, [debouncedSearchTerm, searchParams, setSearchParams, mapSearchTerm]);
  
  useEffect(() => {
    isInitialLoadRef.current = false;
    
    return () => {
      if (searchUpdateTimeoutRef.current) {
        clearTimeout(searchUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (searchParams.get('mapTools') === 'radius') {
      setIsRadiusActive(true);
      setUserLocation(DEFAULT_LOCATION);
      
      setTimeout(() => {
        toast.info("Click and drag to adjust the radius or move the center point", {
          duration: 5000,
          id: "map-instruction",
        });
      }, 500);
    }
    
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setMapSearchTerm(searchFromUrl);
      handleSearch(searchFromUrl);
    }
  }, []);

  const handleVenueClick = useCallback((venueId: string) => {
    navigate(`/venue/${venueId}`, { replace: false });
  }, [navigate]);
  
  const handleSearch = useCallback((term: string) => {
    if (term === lastSearchQuery.current || isSearchInProgress.current) {
      return;
    }
    
    lastSearchQuery.current = term;
    isSearchInProgress.current = true;
    
    if (!term.trim()) {
      setFilteredVenues(memoizedVenues);
      setMapSearchTerm('');
      isSearchInProgress.current = false;
      return;
    }
    
    setMapSearchTerm(term);
    
    setTimeout(() => {
      const searchLower = term.toLowerCase();
      const results = memoizedVenues.filter(venue => 
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
      isSearchInProgress.current = false;
    }, 10);
  }, [memoizedVenues]);
  
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
  
  // Modified to support drag functionality
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

  // New handler for circle drag
  const handleCircleDrag = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && isRadiusActive) {
      const newLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setUserLocation(newLocation);
      
      if (window.google && window.google.maps) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setLocationAddress(results[0].formatted_address);
          } else {
            setLocationAddress("Custom Location");
          }
        });
      }
    }
  }, [isRadiusActive]);
  
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
  
  useEffect(() => {
    if (!debouncedSearchTerm) {
      setFilteredVenues(memoizedVenues);
    } else {
      handleSearch(debouncedSearchTerm);
    }
  }, [memoizedVenues, debouncedSearchTerm, handleSearch]);
  
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
  
  const getAppliedFilters = () => {
    const searchParams = new URL(window.location.href).searchParams;
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
  };
  
  const appliedFilters = getAppliedFilters();
  
  const handleClearFilter = (filter: string) => {
    const filterType = filter.split(':')[0].trim().toLowerCase();
    const searchParams = new URL(window.location.href).searchParams;
    const newParams = new URLSearchParams(searchParams);
    
    if (filterType === 'search') {
      newParams.delete('search');
    } else if (filterType === 'category') {
      newParams.delete('categoryId');
    } else if (filterType === 'city') {
      newParams.delete('cityId');
    }
    
    window.history.replaceState(null, '', `?${newParams.toString()}`);
    window.location.reload();
  };
  
  const handleClearSearch = useCallback(() => {
    setMapSearchTerm('');
    
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
    
    setFilteredVenues(memoizedVenues);
  }, [searchParams, setSearchParams, memoizedVenues]);
  
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
      {isSettingManualLocation && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-findvenue-surface/90 backdrop-blur-md p-3 rounded-md text-center border border-white/10 animate-scale-in">
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
                draggable={true}
                onDragStart={() => setIsDraggingCircle(true)}
                onDragEnd={(e) => {
                  if (e.latLng) {
                    handleCircleDrag(e);
                  }
                  setIsDraggingCircle(false);
                }}
                options={{
                  fillColor: '#10B981',
                  fillOpacity: 0.15,
                  strokeColor: '#10B981',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  editable: true, // Allow radius editing
                }}
              />
              <Marker
                position={userLocation}
                draggable={true}
                onDragEnd={(e) => {
                  if (e.latLng) {
                    const newLoc = {
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng()
                    };
                    setUserLocation(newLoc);
                    
                    // Reverse geocode to get address
                    if (window.google && window.google.maps) {
                      const geocoder = new google.maps.Geocoder();
                      geocoder.geocode({ location: newLoc }, (results, status) => {
                        if (status === 'OK' && results && results[0]) {
                          setLocationAddress(results[0].formatted_address);
                        } else {
                          setLocationAddress("Custom Location");
                        }
                      });
                    }
                  }
                }}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
                animation={google.maps.Animation.DROP}
              >
                {selectedVenue === null && !isDraggingCircle && (
                  <InfoWindow
                    position={userLocation}
                    onCloseClick={() => setSelectedVenue(null)}
                  >
                    <div className="text-black text-sm p-1">
                      <h3 className="font-bold text-base mb-1">{locationAddress}</h3>
                      <p className="text-xs text-gray-600">
                        Showing venues within {radiusInKm.toFixed(1)} km
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Drag marker or circle to move. Resize circle to change radius.
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
        handleManualLocationSetting={() => {
          setIsSettingManualLocation(true);
          setMapCursor('crosshair');
          toast.info("Click on the map to set your location");
        }}
        handleClearSearch={handleClearSearch}
        fitBoundsToMarkers={fitBoundsToMarkers}
        resetToDefaultLocation={resetToDefaultLocation}
      />
    </div>
  );
});

MapView.displayName = "MapView";

export default MapView;
