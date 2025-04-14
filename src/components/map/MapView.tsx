
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Venue } from '@/hooks/useSupabaseVenues';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
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

// Create custom marker icons
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const highlightedIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  venues: Venue[];
  isLoading?: boolean;
  highlightedVenueId?: string;
  onFilteredVenuesChange?: (venues: Venue[]) => void;
}

// Component to handle map movement and updates
const MapUpdater = ({
  center,
  zoom,
  searchText
}: {
  center: [number, number];
  zoom: number;
  searchText: string;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, map, zoom]);
  
  return null;
};

const MapView = ({
  venues,
  isLoading = false,
  highlightedVenueId,
  onFilteredVenuesChange
}: MapViewProps) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]); // Default to Riyadh
  const [mapZoom, setMapZoom] = useState(12);
  const [searchText, setSearchText] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [radiusActive, setRadiusActive] = useState(false);
  const [radiusSize, setRadiusSize] = useState(1); // km
  
  const mapRef = useRef<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translate } = useTranslation();

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
        setMapCenter([venue.latitude, venue.longitude]);
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
    setMapCenter([lat, lng]);
    setMapZoom(14);
    setCurrentAddress(address);
  };
  
  // Handle manual location
  const handleManualLocationSetting = (coordinates?: [number, number]) => {
    if (coordinates) {
      setMapCenter(coordinates);
      setMapZoom(14);
    }
  };
  
  // Toggle radius search
  const toggleRadiusSearch = () => {
    setRadiusActive(!radiusActive);
  };
  
  // Update radius size
  const handleRadiusSizeChange = (size: number) => {
    setRadiusSize(size);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchText('');
  };

  // Fit bounds to markers
  const fitBoundsToMarkers = () => {
    // Implementation would go here
    console.log("Fit to markers clicked");
  };

  // Reset to default location
  const resetToDefaultLocation = () => {
    setMapCenter([24.7136, 46.6753]); // Default to Riyadh
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
      
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {filteredVenues.map((venue) => {
          if (!venue.latitude || !venue.longitude) return null;
          
          return (
            <Marker
              key={venue.id}
              position={[venue.latitude, venue.longitude]}
              icon={venue.id === highlightedVenueId ? highlightedIcon : defaultIcon}
              eventHandlers={{
                click: () => {
                  setSelectedVenue(venue);
                }
              }}
            >
              <Popup 
                className="venue-popup" 
                minWidth={280} 
                maxWidth={320}
              >
                <Card className="bg-findvenue-surface/95 backdrop-blur-md border border-findvenue/20 overflow-hidden">
                  <div className="relative h-32 overflow-hidden">
                    {venue.imageUrl && (
                      <img 
                        src={venue.imageUrl} 
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {venue.featured && (
                      <Badge className="absolute top-2 right-2 bg-findvenue-gold text-black">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-md leading-tight">{venue.name}</h3>
                      <div className="flex items-center text-findvenue-gold">
                        <Star className="w-3 h-3 fill-findvenue-gold text-findvenue-gold mr-1" />
                        <span className="text-xs font-medium">{venue.rating}</span>
                      </div>
                    </div>
                    
                    <div className="text-findvenue-text-muted text-xs mb-2 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{venue.city || venue.address}</span>
                    </div>
                    
                    <div className="flex items-center text-xs text-findvenue-text-muted mb-2">
                      <Users className="w-3 h-3 mr-1" />
                      <span>Up to {venue.capacity.max}</span>
                    </div>
                    
                    <div className="text-sm font-semibold mb-3">
                      {venue.pricing.currency} {venue.pricing.startingPrice.toLocaleString()}
                    </div>
                    
                    <Button 
                      className="w-full bg-findvenue hover:bg-findvenue-dark text-white"
                      size="sm"
                      onClick={() => handleVenueCardClick(venue)}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              </Popup>
            </Marker>
          );
        })}
        
        <MapUpdater 
          center={mapCenter} 
          zoom={mapZoom}
          searchText={searchText}
        />
        
        <MapControls 
          isCompactControls={true}
          isRadiusActive={radiusActive}
          toggleRadiusSearch={toggleRadiusSearch}
          handleManualLocationSetting={handleManualLocationSetting}
          radiusSize={radiusSize}
          setRadiusSize={handleRadiusSizeChange}
          currentLocation={mapCenter}
          fitBoundsToMarkers={fitBoundsToMarkers}
          resetToDefaultLocation={resetToDefaultLocation}
          handleClearSearch={handleClearSearch}
        />
      </MapContainer>
    </div>
  );
};

export default MapView;
