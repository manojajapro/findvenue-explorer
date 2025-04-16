
import React, { useState, useEffect, useMemo } from 'react';
import { useGoogleMap } from '@/hooks/useGoogleMap';
import { useRealTimeVenues } from '@/hooks/useRealTimeVenues';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { CircleIcon, MapPin, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Venue } from '@/types/global';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface HomePageMapProps {
  height?: string;
}

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh
const DEFAULT_ZOOM = 12;

const HomePageMap: React.FC<HomePageMapProps> = ({ height = '400px' }) => {
  const navigate = useNavigate();
  const { isLoaded } = useGoogleMap();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [venueType, setVenueType] = useState<string>('');
  const [venueTypeOptions, setVenueTypeOptions] = useState<string[]>([]);
  
  const { venues, isLoading } = useRealTimeVenues();
  
  // Fetch venue types from the database
  useEffect(() => {
    const fetchVenueTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('type')
          .not('type', 'is', null);
        
        if (error) throw error;
        
        if (data) {
          // Extract unique venue types, filter out null/empty values, and capitalize
          const typesArray = data
            .map(venue => venue.type)
            .filter((type): type is string => typeof type === 'string' && type.trim() !== '')
            .map(type => type.charAt(0).toUpperCase() + type.slice(1));
            
          const uniqueTypes = [...new Set(typesArray)].sort();
          setVenueTypeOptions(uniqueTypes);
        }
      } catch (err) {
        console.error('Error fetching venue types:', err);
      }
    };
    
    fetchVenueTypes();
  }, []);
  
  // Filter venues based on selected type
  const filteredVenues = useMemo(() => {
    if (!venueType) return venues;
    
    return venues.filter(venue => 
      venue.type && venue.type.toLowerCase() === venueType.toLowerCase()
    );
  }, [venues, venueType]);
  
  const onMapLoad = (map: google.maps.Map) => {
    setMapInstance(map);
  };
  
  const handleMarkerClick = (venueId: string) => {
    setActiveMarker(venueId);
  };
  
  const handleInfoWindowClose = () => {
    setActiveMarker(null);
  };
  
  const handleViewVenue = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const handleSearch = async () => {
    if (!searchLocation.trim()) return;
    
    if (!mapInstance) return;
    
    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const result = await geocoder.geocode({ address: searchLocation });
      
      if (result.results && result.results.length > 0) {
        const { lat, lng } = result.results[0].geometry.location;
        const newCenter = { lat: lat(), lng: lng() };
        
        setCenter(newCenter);
        mapInstance.setCenter(newCenter);
        mapInstance.setZoom(15);
      } else {
        console.log('No results found for the search location');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search location..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="pl-10 pr-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-findvenue-text-muted" />
          </div>
        </div>
        
        <div>
          <Select value={venueType} onValueChange={setVenueType}>
            <SelectTrigger>
              <SelectValue placeholder="Venue Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">All Types</SelectItem>
                {venueTypeOptions.map((type, index) => (
                  <SelectItem key={index} value={type.toLowerCase()}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div style={{ height, width: '100%' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ height: '100%', width: '100%' }}
            center={center}
            zoom={DEFAULT_ZOOM}
            onLoad={onMapLoad}
            options={{
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
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
              // Only show markers if they have latitude and longitude
              if (venue.lat && venue.lng) {
                return (
                  <Marker
                    key={venue.id}
                    position={{ lat: venue.lat, lng: venue.lng }}
                    onClick={() => handleMarkerClick(venue.id)}
                    icon={{
                      url: '/lovable-uploads/25610b8c-bf06-4ae3-8110-9c4e8133a31b.png',
                      scaledSize: new window.google.maps.Size(32, 32)
                    }}
                  >
                    {activeMarker === venue.id && (
                      <InfoWindow onCloseClick={handleInfoWindowClose}>
                        <div className="max-w-[250px]">
                          <h3 className="font-semibold text-gray-800 mb-1">{venue.name}</h3>
                          {venue.type && (
                            <div className="mb-1 flex items-center text-sm text-gray-500">
                              <CircleIcon className="h-3 w-3 mr-1" />
                              <span>{typeof venue.type === 'string' ? venue.type.charAt(0).toUpperCase() + venue.type.slice(1) : ''}</span>
                            </div>
                          )}
                          <div className="mb-2 flex items-center text-sm text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{venue.address}</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewVenue(venue.id);
                            }}
                            className="w-full"
                          >
                            View Details
                          </Button>
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                );
              }
              return null;
            })}
          </GoogleMap>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p>Loading map...</p>
          </div>
        )}
      </div>
      
      {filteredVenues.length === 0 && !isLoading && (
        <Card className="p-4 text-center">
          <p>No venues found for the selected criteria.</p>
        </Card>
      )}
    </div>
  );
};

export default HomePageMap;
