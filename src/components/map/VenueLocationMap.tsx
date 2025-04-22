import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Search, Ruler, Locate, Navigation, MapIcon, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGeocode } from '@/hooks/useGeocode';

export interface VenueLocationMapProps {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  nearbyVenues?: Array<{
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    featured?: boolean;
  }>;
  highlightedVenueId?: string;
}

const createVenueMarkerIcon = (featured: boolean = false) => {
  return {
    url: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36">
        <path fill="${featured ? '#E6B325' : '#4F46E5'}" stroke="white" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle fill="white" cx="12" cy="9" r="3"/>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(24, 36),
    anchor: new google.maps.Point(12, 36),
    origin: new google.maps.Point(0, 0)
  };
};

const containerStyle = {
  width: '100%',
  height: '250px'
};

const DEFAULT_LOCATION = {
  lat: 24.774265,
  lng: 46.738586
};

const VenueLocationMap = ({ 
  name, 
  address, 
  latitude, 
  longitude, 
  editable = false,
  onLocationChange,
  nearbyVenues = [],
  highlightedVenueId
}: VenueLocationMapProps) => {
  const [position, setPosition] = useState<google.maps.LatLngLiteral>({
    lat: latitude || DEFAULT_LOCATION.lat,
    lng: longitude || DEFAULT_LOCATION.lng
  });
  const [addressLoaded, setAddressLoaded] = useState(false);
  const { geocodePinCode } = useGeocode();

  useEffect(() => {
    const loadAddressLocation = async () => {
      if (!latitude && !longitude && address && !addressLoaded) {
        try {
          const coordinates = await geocodePinCode(address);
          if (coordinates) {
            setPosition({
              lat: coordinates.lat,
              lng: coordinates.lng
            });
            setAddressLoaded(true);
          }
        } catch (error) {
          console.error("Error geocoding address:", error);
          toast.error("Could not load exact location from address");
        }
      }
    };

    loadAddressLocation();
  }, [address, latitude, longitude, addressLoaded, geocodePinCode]);

  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [isRadiusActive, setIsRadiusActive] = useState(false);
  const [radiusInKm, setRadiusInKm] = useState(1.0);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isSettingManualLocation, setIsSettingManualLocation] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: 'google-map-script'
  });

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

  const venuesInRadius = userLocation ? nearbyVenues.filter(venue => {
    if (!venue.latitude || !venue.longitude) return false;
    
    const distance = calculateDistance(
      userLocation.lat, 
      userLocation.lng, 
      venue.latitude, 
      venue.longitude
    );
    
    return distance <= radiusInKm;
  }) : [];

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (editable && e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setPosition(newPosition);
    } else if (isSettingManualLocation && e.latLng) {
      const newLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setUserLocation(newLocation);
      setIsRadiusActive(true);
      setIsSettingManualLocation(false);
      
      toast.success("Custom location set successfully");
      
      if (mapRef.current) {
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(14);
      }
    }
  }, [editable, isSettingManualLocation]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (editable && e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setPosition(newPosition);
    }
  }, [editable]);

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
          
          if (mapRef.current) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
            mapRef.current.setZoom(14);
          }

          toast.success("Current location detected successfully");
        },
        (error) => {
          console.error("Error getting user location:", error);
          toast.error("Could not get your location. Using default location instead.");
          
          setUserLocation(DEFAULT_LOCATION);
          setIsRadiusActive(true);
          
          if (mapRef.current) {
            mapRef.current.panTo(DEFAULT_LOCATION);
            mapRef.current.setZoom(14);
          }
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      toast.error("Your browser doesn't support location services. Using default location.");
      
      setUserLocation(DEFAULT_LOCATION);
      setIsRadiusActive(true);
      
      if (mapRef.current) {
        mapRef.current.panTo(DEFAULT_LOCATION);
        mapRef.current.setZoom(14);
      }
    }
  }, []);

  const handleManualLocationSetting = useCallback(() => {
    setIsSettingManualLocation(true);
    
    if (!userLocation) {
      setUserLocation(DEFAULT_LOCATION);
      
      if (mapRef.current) {
        mapRef.current.panTo(DEFAULT_LOCATION);
        mapRef.current.setZoom(14); 
      }
    }
    
    toast.info("Click on the map to set your location", {
      description: "Click anywhere on the map to set your location for radius search",
      position: "top-center",
      duration: 5000
    });
    
    setIsRadiusActive(true);
  }, [userLocation]);

  const toggleRadiusSearch = useCallback(() => {
    if (isRadiusActive) {
      setIsRadiusActive(false);
    } else {
      setUserLocation(DEFAULT_LOCATION);
      setIsRadiusActive(true);
      
      if (mapRef.current) {
        mapRef.current.panTo(DEFAULT_LOCATION);
        mapRef.current.setZoom(14);
      }
      
      handleManualLocationSetting();
    }
  }, [isRadiusActive, handleManualLocationSetting]);

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      setPosition({
        lat: latitude,
        lng: longitude
      });
    }
  }, [latitude, longitude]);

  if (loadError) {
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-findvenue" />
            Location
          </h3>
        </div>
        <div className="p-6 text-center text-findvenue-text-muted">
          <p>Error loading maps: {loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-findvenue" />
            Location
          </h3>
        </div>
        <div className="p-6 text-center text-findvenue-text-muted">
          <p>Loading maps...</p>
        </div>
      </div>
    );
  }

  if (!latitude && !longitude && !editable) {
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-findvenue" />
            Location
          </h3>
        </div>
        <div className="p-6 text-center text-findvenue-text-muted">
          <p>Exact location will be provided after booking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold flex items-center">
          <Building2 className="w-4 h-4 mr-2 text-findvenue" />
          Location {editable && <span className="text-xs text-findvenue-text-muted ml-2">(Click anywhere to set location)</span>}
        </h3>
      </div>
      
      <div className="h-[250px] w-full relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={position}
          zoom={14}
          onClick={handleMapClick}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: "all",
                elementType: "all",
                stylers: [
                  { saturation: -100 }
                ]
              }
            ]
          }}
        >
          {/* Main Venue Marker */}
          {position && (
            <Marker
              position={position}
              draggable={editable}
              onDragEnd={handleMarkerDragEnd}
              onClick={() => setInfoWindowOpen(true)}
              icon={createVenueMarkerIcon(false)}
            >
              {infoWindowOpen && (
                <InfoWindow
                  position={position}
                  onCloseClick={() => setInfoWindowOpen(false)}
                >
                  <div className="text-black p-2">
                    <strong className="text-findvenue-dark">{name}</strong><br/>
                    {address}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )}

          {/* Nearby Venue Markers */}
          {nearbyVenues.map((venue) => (
            <Marker
              key={venue.id}
              position={{ lat: venue.latitude, lng: venue.longitude }}
              onClick={() => setSelectedVenue(venue.id)}
              icon={createVenueMarkerIcon(venue.featured)}
              animation={venue.id === highlightedVenueId ? google.maps.Animation.BOUNCE : undefined}
            >
              {selectedVenue === venue.id && (
                <InfoWindow
                  position={{ lat: venue.latitude, lng: venue.longitude }}
                  onCloseClick={() => setSelectedVenue(null)}
                >
                  <div className="text-black p-2">
                    <strong className="text-findvenue-dark">{venue.name}</strong><br/>
                    {venue.address}
                    {userLocation && (
                      <div className="mt-1 text-xs text-gray-600">
                        {calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          venue.latitude,
                          venue.longitude
                        ).toFixed(1)} km away
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}

          {/* User Location and Radius Circle */}
          {userLocation && isRadiusActive && (
            <>
              <Circle 
                center={userLocation} 
                radius={radiusInKm * 1000} 
                options={{
                  fillColor: '#8B5CF6',
                  fillOpacity: 0.1,
                  strokeColor: '#8B5CF6',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
              <Marker
                position={userLocation}
                icon={createVenueMarkerIcon(true)}
              >
                <InfoWindow>
                  <div className="text-black text-xs">
                    {userLocation.lat === DEFAULT_LOCATION.lat && userLocation.lng === DEFAULT_LOCATION.lng 
                      ? "Default location (11461)" 
                      : "Your selected location"}
                  </div>
                </InfoWindow>
              </Marker>
            </>
          )}
          
          {isSettingManualLocation && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-black bg-opacity-70 text-white p-2 rounded pointer-events-none">
              Click on map to set location
            </div>
          )}
        </GoogleMap>
        
        <div className="p-3 bg-findvenue-card-bg/70 backdrop-blur-sm absolute bottom-0 left-0 right-0 text-sm z-[400]">
          {editable ? (
            <div className="flex justify-between items-center">
              <span>Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}</span>
              <span className="text-xs text-findvenue-text-muted">
                {editable ? 'Click on map or drag marker to set location' : address}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span>{address}</span>
              
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  {isRadiusActive && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 bg-findvenue-card-bg/80 border-white/10"
                            onClick={handleManualLocationSetting}
                          >
                            <MapIcon className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Set location manually
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 bg-findvenue-card-bg/80 border-white/10"
                            onClick={() => {
                              setUserLocation(DEFAULT_LOCATION);
                              setIsRadiusActive(true);
                              if (mapRef.current) {
                                mapRef.current.panTo(DEFAULT_LOCATION);
                                mapRef.current.setZoom(14);
                              }
                            }}
                          >
                            <Navigation className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Use default location
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        size="icon"
                        className={`h-7 w-7 ${isRadiusActive ? 'bg-findvenue text-white' : 'bg-findvenue-card-bg/80'} border-white/10`}
                        onClick={toggleRadiusSearch}
                      >
                        <Locate className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {isRadiusActive ? 'Disable radius search' : 'Enable radius search'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
      
      {isRadiusActive && userLocation && (
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <Ruler className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
              <span className="text-xs font-medium">Radius: {radiusInKm.toFixed(1)} km</span>
            </div>
            <span className="text-xs text-findvenue">
              {venuesInRadius.length} venues in range
            </span>
          </div>
          <Slider
            value={[radiusInKm]}
            min={0.5}
            max={25}
            step={0.5}
            onValueChange={(values) => setRadiusInKm(values[0])}
            className="py-1"
          />
          
          {isSettingManualLocation && (
            <div className="mt-2 text-xs text-center text-findvenue-text-muted">
              Click anywhere on the map to set your custom location
            </div>
          )}
        </div>
      )}
      
      {editable && (
        <div className="p-3 border-t border-white/10">
          <div className="text-sm text-findvenue-text-muted mb-2">
            Set the exact location of your venue by clicking on the map or dragging the marker.
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueLocationMap;
