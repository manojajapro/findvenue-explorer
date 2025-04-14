
import { useState, useEffect, useRef, useCallback } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationSearchInput from './LocationSearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import MapControls from './MapControls';
import EnhancedMapSearch from './EnhancedMapSearch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from '@/hooks/useTranslation';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

interface MapViewProps {
  venues: Venue[];
  isLoading?: boolean;
  highlightedVenueId?: string;
  onFilteredVenuesChange?: (venues: Venue[]) => void;
}

const MapView = ({
  venues,
  isLoading = false,
  highlightedVenueId,
  onFilteredVenuesChange
}: MapViewProps) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>({lat: 24.7136, lng: 46.6753}); // Default to Riyadh
  const [mapZoom, setMapZoom] = useState(12);
  const [searchText, setSearchText] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [radiusActive, setRadiusActive] = useState(false);
  const [radiusSize, setRadiusSize] = useState(1); // km
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translate } = useTranslation();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });
  
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Filter venues based on search text, radius, and other filters
  const filteredVenues = venues.filter(venue => {
    // Text search filter
    if (searchText && !venue.name.toLowerCase().includes(searchText.toLowerCase()) && 
        !venue.city?.toLowerCase().includes(searchText.toLowerCase()) &&
        !venue.description?.toLowerCase().includes(searchText.toLowerCase()) &&
        !venue.address?.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    // Radius filter
    if (radiusActive && venue.latitude && venue.longitude) {
      // Calculate distance between venue and map center
      const distance = calculateDistance(
        mapCenter.lat, 
        mapCenter.lng, 
        venue.latitude, 
        venue.longitude
      );
      
      // Convert km to meters for comparison
      if (distance > radiusSize) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  // When highlighted venue ID changes from hovering on list, focus on that venue
  useEffect(() => {
    if (highlightedVenueId && venues) {
      const venue = venues.find(v => v.id === highlightedVenueId);
      if (venue && venue.latitude && venue.longitude) {
        setMapCenter({lat: venue.latitude, lng: venue.longitude});
        setMapZoom(16);
        setSelectedVenue(venue);
      }
    }
  }, [highlightedVenueId, venues]);

  // When filtered venues change, notify parent component
  useEffect(() => {
    if (onFilteredVenuesChange) {
      onFilteredVenuesChange(filteredVenues);
    }
  }, [filteredVenues, onFilteredVenuesChange]);

  const handleVenueCardClick = async (venue: Venue) => {
    if (user) {
      navigate(`/venue/${venue.id}`);
    } else {
      localStorage.setItem('redirectVenueId', venue.id);
      toast({
        title: await translate("Login Required"),
        description: await translate("Please login to view venue details"),
        variant: "default",
      });
      navigate('/login');
    }
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchText(term);
  };

  // Handle location select
  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setMapCenter({lat, lng});
    setMapZoom(14);
    setCurrentAddress(address);
    
    // Activate radius search if not already active
    if (!radiusActive) {
      setRadiusActive(true);
    }
  };
  
  // Handle manual location
  const handleManualLocationSetting = (coordinates?: [number, number]) => {
    if (coordinates) {
      setMapCenter({lat: coordinates[0], lng: coordinates[1]});
      setMapZoom(14);
      
      // Activate radius search if not already active
      if (!radiusActive) {
        setRadiusActive(true);
      }
    }
  };
  
  // Toggle radius search
  const toggleRadiusSearch = () => {
    setRadiusActive(!radiusActive);
  };
  
  // Handle radius size changes
  const handleRadiusSizeChange = (size: number) => {
    setRadiusSize(size);
  };
  
  // Increase radius
  const increaseRadius = () => {
    setRadiusSize(prev => Math.min(prev + 1, 20));
  };
  
  // Decrease radius
  const decreaseRadius = () => {
    setRadiusSize(prev => Math.max(prev - 1, 1));
  };
  
  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({lat: latitude, lng: longitude});
          setMapZoom(15);
          
          // Activate radius search if not already active
          if (!radiusActive) {
            setRadiusActive(true);
          }
          
          // Show toast notification
          toast({
            title: "Location Set",
            description: "Using your current location",
            variant: "default",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location Error",
            description: "Could not get your location. Please check your browser permissions.",
            variant: "destructive",
          });
        },
        { maximumAge: 60000, timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      toast({
        title: "Geolocation Unavailable",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
    }
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    setSearchText('');
  };
  
  // Fit bounds to markers
  const fitBoundsToMarkers = () => {
    if (!mapRef.current || filteredVenues.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    
    filteredVenues.forEach(venue => {
      if (venue.latitude && venue.longitude) {
        bounds.extend({lat: venue.latitude, lng: venue.longitude});
      }
    });
    
    mapRef.current.fitBounds(bounds);
    
    // Adjust zoom if too high
    setTimeout(() => {
      if (mapRef.current && mapRef.current.getZoom() && mapRef.current.getZoom()! > 16) {
        mapRef.current.setZoom(16);
      }
    }, 100);
  };
  
  // Reset to default location
  const resetToDefaultLocation = () => {
    setMapCenter({lat: 24.7136, lng: 46.6753}); // Default to Riyadh
    setMapZoom(12);
  };

  // Handle clear filter
  const handleClearFilter = (filter: string) => {
    setAppliedFilters(prev => prev.filter(f => f !== filter));
  };
  
  // Callback for EnhancedMapSearch component
  const handleRadiusChange = (size: number) => {
    setRadiusSize(size);
  };

  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-findvenue-background">
        <Skeleton className="absolute top-4 left-4 right-4 h-10 z-10 rounded-md" />
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        {radiusActive ? (
          <EnhancedMapSearch
            onSearch={handleSearch}
            onLocationSelect={handleLocationSelect}
            onRadiusChange={handleRadiusSizeChange}
            onManualLocation={() => {}}
            onCurrentLocation={getCurrentLocation}
            venueCount={filteredVenues.length}
            radiusInKm={radiusSize}
            isRadiusActive={radiusActive}
            searchText={searchText}
            setSearchText={setSearchText}
            appliedFilters={appliedFilters}
            onClearFilter={handleClearFilter}
          />
        ) : (
          <div className="bg-findvenue-surface/95 backdrop-blur-md shadow-lg rounded-md border border-white/10 overflow-hidden">
            <LocationSearchInput
              onSearch={handleSearch}
              onLocationSelect={handleLocationSelect}
              searchText={searchText}
              setSearchText={setSearchText}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
      
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          }}
        >
          {filteredVenues.map((venue) => {
            if (!venue.latitude || !venue.longitude) return null;
            
            const isHighlighted = venue.id === highlightedVenueId;
            
            return (
              <MarkerF
                key={venue.id}
                position={{lat: venue.latitude, lng: venue.longitude}}
                onClick={() => setSelectedVenue(venue)}
                animation={isHighlighted ? google.maps.Animation.BOUNCE : undefined}
                icon={{
                  url: isHighlighted 
                    ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
              />
            );
          })}
          
          {/* Display radius circle when radius search is active */}
          {radiusActive && (
            <CircleF
              center={mapCenter}
              radius={radiusSize * 1000} // Convert km to meters
              options={{
                fillColor: '#5046E4',
                fillOpacity: 0.1,
                strokeColor: '#5046E4',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}
          
          {selectedVenue && selectedVenue.latitude && selectedVenue.longitude && (
            <InfoWindowF
              position={{lat: selectedVenue.latitude, lng: selectedVenue.longitude}}
              onCloseClick={() => setSelectedVenue(null)}
            >
              <Card className="bg-white w-72 p-0 overflow-hidden">
                <div className="relative h-32 overflow-hidden">
                  {selectedVenue.imageUrl && (
                    <img 
                      src={selectedVenue.imageUrl} 
                      alt={selectedVenue.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {selectedVenue.featured && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-md leading-tight">{selectedVenue.name}</h3>
                    <div className="flex items-center text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-1" />
                      <span className="text-xs font-medium">{selectedVenue.rating}</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-600 text-xs mb-2 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{selectedVenue.city || selectedVenue.address}</span>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-600 mb-2">
                    <Users className="w-3 h-3 mr-1" />
                    <span>Up to {selectedVenue.capacity.max}</span>
                  </div>
                  
                  <div className="text-sm font-semibold mb-3 text-gray-800">
                    {selectedVenue.pricing.currency} {selectedVenue.pricing.startingPrice.toLocaleString()}
                  </div>
                  
                  <Button 
                    className="w-full bg-findvenue hover:bg-findvenue-dark text-white"
                    size="sm"
                    onClick={() => handleVenueCardClick(selectedVenue)}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            </InfoWindowF>
          )}
        </GoogleMap>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <p>Loading Map...</p>
        </div>
      )}
      
      <MapControls 
        isCompactControls={true}
        isRadiusActive={radiusActive}
        toggleRadiusSearch={toggleRadiusSearch}
        handleManualLocationSetting={handleManualLocationSetting}
        radiusSize={radiusSize}
        setRadiusSize={handleRadiusSizeChange}
        currentLocation={[mapCenter.lat, mapCenter.lng]}
        fitBoundsToMarkers={fitBoundsToMarkers}
        resetToDefaultLocation={resetToDefaultLocation}
        handleClearSearch={handleClearSearch}
        getCurrentLocation={getCurrentLocation}
        increaseRadius={increaseRadius}
        decreaseRadius={decreaseRadius}
      />
    </div>
  );
};

export default MapView;
