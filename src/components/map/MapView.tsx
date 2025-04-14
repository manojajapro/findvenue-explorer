
import { useState, useEffect, useRef, useCallback } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationSearchInput from './LocationSearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import MapControls from './MapControls';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from '@/hooks/useTranslation';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

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

  // Filter venues based on search text or location
  const filteredVenues = venues.filter(venue => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    return (
      venue.name.toLowerCase().includes(searchLower) ||
      (venue.city && venue.city.toLowerCase().includes(searchLower)) ||
      (venue.description && venue.description.toLowerCase().includes(searchLower)) ||
      (venue.address && venue.address.toLowerCase().includes(searchLower))
    );
  });

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
  };
  
  // Handle manual location
  const handleManualLocationSetting = (coordinates?: [number, number]) => {
    if (coordinates) {
      setMapCenter({lat: coordinates[0], lng: coordinates[1]});
      setMapZoom(14);
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
        },
        () => {
          alert("Could not get your location");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser");
    }
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    setSearchText('');
  };
  
  // Fit bounds to markers
  const fitBoundsToMarkers = () => {
    if (!mapRef.current || venues.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    
    venues.forEach(venue => {
      if (venue.latitude && venue.longitude) {
        bounds.extend({lat: venue.latitude, lng: venue.longitude});
      }
    });
    
    mapRef.current.fitBounds(bounds);
  };
  
  // Reset to default location
  const resetToDefaultLocation = () => {
    setMapCenter({lat: 24.7136, lng: 46.6753}); // Default to Riyadh
    setMapZoom(12);
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
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-findvenue-surface/95 backdrop-blur-md shadow-lg rounded-md border border-white/10 overflow-hidden">
        <LocationSearchInput
          onSearch={handleSearch}
          onLocationSelect={handleLocationSelect}
          searchText={searchText}
          setSearchText={setSearchText}
          isLoading={isLoading}
        />
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
          
          {radiusActive && mapRef.current && (
            <div className="radius-circle" /> // This would be implemented using a Circle component if using the actual library
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
