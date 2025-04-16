import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, MarkerF, LoadScript, InfoWindowF } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Building, MapPin, X, Search } from 'lucide-react';
import LocationSearchInput from './LocationSearchInput';
import MapControls from './MapControls';
import { Input } from '@/components/ui/input';

// Define the VenueWithDistance interface extending Venue
interface VenueWithDistance extends Venue {
  distance?: number;
  categoryNames?: string[];
  city_name?: string;
  category_name?: string[] | string;
  reviews_count?: number;
  starting_price?: number;
  currency?: string;
  type?: string;
}

// Extended LocationSearchInputProps interface
interface LocationSearchInputProps {
  onChange: (latLng: any) => void;
}

// Map container style
const mapContainerStyle = {
  width: '100%',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 24.7136,
  lng: 46.6753
};

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

interface HomePageMapProps {
  height?: string;
}

const HomePageMap = ({ height = '400px' }: HomePageMapProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [venues, setVenues] = useState<VenueWithDistance[]>([]);
  const [nearbyVenues, setNearbyVenues] = useState<VenueWithDistance[] | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithDistance | null>(null);
  const [selectedArea, setSelectedArea] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await fetch('/api/venues');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setVenues(data);
      } catch (error) {
        console.error("Could not fetch venues:", error);
      }
    };
    
    fetchVenues();
  }, []);
  
  const onLoad = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userLatLng);
          setMapCenter(userLatLng);
          mapInstance.setCenter(userLatLng);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };
  
  const onMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const clickedLatLng = event.latLng.toJSON();
      
      // Use Google Maps Geocoding API to get address details
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: clickedLatLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results) {
          const area = {
            name: results[0].formatted_address,
            latitude: clickedLatLng.lat,
            longitude: clickedLatLng.lng
          };
          setSelectedArea(area);
          
          // Find nearby venues
          if (map) {
            const service = new google.maps.places.PlacesService(map);
            service.nearbySearch(
              {
                location: clickedLatLng,
                radius: searchRadius,
                type: ['establishment'],
              },
              (places, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && places) {
                  const nearbyVenueDetails = venues.filter(venue => {
                    const venueLat = parseFloat(venue.latitude?.toString() || '0');
                    const venueLng = parseFloat(venue.longitude?.toString() || '0');
                    
                    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                      new google.maps.LatLng(clickedLatLng.lat, clickedLatLng.lng),
                      new google.maps.LatLng(venueLat, venueLng)
                    );
                    
                    return distance <= searchRadius;
                  });
                  
                  setNearbyVenues(nearbyVenueDetails);
                } else {
                  setNearbyVenues(null);
                }
              }
            );
          }
        } else {
          setSelectedArea(null);
          setNearbyVenues(null);
          console.error("Geocoding failed:", status);
        }
      });
    }
  };
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const handleInfoWindowClose = () => {
    setSelectedVenue(null);
  };
  
  const handleAreaSelect = (latLng: any) => {
    setMapCenter(latLng);
    if (map) {
      map.panTo(latLng);
    }
  };
  
  const handleSearchRadiusChange = (newRadius: number) => {
    setSearchRadius(newRadius);
  };
  
  const handleSearchToggle = () => {
    setIsSearchVisible(!isSearchVisible);
    // Focus on the search input when it becomes visible
    if (!isSearchVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    // Filter venues based on search query
    const filteredVenues = venues.filter(venue =>
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.city_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.category_name?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredVenues.length > 0) {
      setVenues(filteredVenues);
      
      // Update map center to the first venue's location
      const firstVenue = filteredVenues[0];
      const lat = parseFloat(firstVenue.latitude?.toString() || '0');
      const lng = parseFloat(firstVenue.longitude?.toString() || '0');
      setMapCenter({ lat, lng });
      
      if (map) {
        map.panTo({ lat, lng });
      }
    } else {
      // Reset to all venues if no match is found
      const fetchVenues = async () => {
        try {
          const response = await fetch('/api/venues');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setVenues(data);
        } catch (error) {
          console.error("Could not fetch venues:", error);
        }
      };
      
      fetchVenues();
      
      // Reset map center to default
      setMapCenter(defaultCenter);
      if (map) {
        map.setCenter(defaultCenter);
      }
    }
  };
  
  const navigateToVenues = () => {
    navigate('/venues');
  };

  return (
    <div className="relative">
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, height: height }}
          zoom={12}
          center={mapCenter}
          onLoad={onLoad}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {venues.map((venue) => (
            <MarkerF
              key={venue.id}
              position={{
                lat: parseFloat(venue.latitude?.toString() || '0'),
                lng: parseFloat(venue.longitude?.toString() || '0'),
              }}
              onClick={() => setSelectedVenue(venue)}
            />
          ))}
        </GoogleMap>
      </LoadScript>
      
      <MapControls
        onRadiusChange={handleSearchRadiusChange}
      />
      
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10">
        <form onSubmit={handleSearchSubmit} className="flex items-center">
          <Input
            type="text"
            placeholder="Search for venues..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="mr-2"
            ref={searchInputRef}
          />
          <Button type="submit" size="icon" aria-label="Search">
            <Search size={16} />
          </Button>
        </form>
      </div>
      
      {/* Venue Info Window */}
      {selectedVenue && (
        <InfoWindowF
          position={{ lat: parseFloat(selectedVenue.latitude?.toString() || '0'), lng: parseFloat(selectedVenue.longitude?.toString() || '0') }}
          onCloseClick={handleInfoWindowClose}
        >
          <Card className="p-0 overflow-hidden max-w-[280px]">
            <div className="relative">
              <img 
                src={selectedVenue.gallery_images && selectedVenue.gallery_images.length > 0 
                  ? selectedVenue.gallery_images[0]
                  : "/placeholder.svg"
                } 
                alt={selectedVenue.name}
                className="w-full h-32 object-cover"
              />
              <X 
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full cursor-pointer" 
                size={20} 
                onClick={handleInfoWindowClose}
              />
            </div>
            
            <div className="p-3">
              <h3 className="font-bold text-lg mb-1 line-clamp-1">{selectedVenue.name}</h3>
              
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="line-clamp-1">{selectedVenue.city_name || selectedVenue.address}</span>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedVenue.type && (
                  <Badge variant="outline" className="text-xs">
                    {selectedVenue.type}
                  </Badge>
                )}
                
                {selectedVenue.category_name && selectedVenue.category_name.length > 0 && (
                  typeof selectedVenue.category_name === 'string' ? (
                    <Badge variant="outline" className="text-xs">
                      {selectedVenue.category_name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {selectedVenue.category_name[0]}
                    </Badge>
                  )
                )}
              </div>
              
              {selectedVenue.reviews_count !== undefined && selectedVenue.reviews_count > 0 && (
                <div className="flex items-center text-xs mb-2">
                  <span className="bg-green-100 text-green-800 px-1 rounded mr-1">★ {selectedVenue.rating}</span>
                  <span className="text-gray-500">({selectedVenue.reviews_count} reviews)</span>
                </div>
              )}
              
              {selectedVenue.starting_price !== undefined && (
                <div className="text-sm font-medium mb-2">
                  From {selectedVenue.currency || 'SAR'} {selectedVenue.starting_price.toLocaleString()}
                </div>
              )}
              
              <Button
                size="sm"
                className="w-full mt-1"
                onClick={() => handleVenueClick(selectedVenue.id)}
              >
                View Details
              </Button>
            </div>
          </Card>
        </InfoWindowF>
      )}
      
      {/* Selected Area Info */}
      {selectedArea && (
        <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{selectedArea.name}</h3>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Building size={12} />
                {nearbyVenues && nearbyVenues.length > 0 && (
                  <span>{nearbyVenues.length} venues nearby</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedArea(null)}
              className="h-7 w-7 p-0"
            >
              <X size={14} />
            </Button>
          </div>
          
          {nearbyVenues && nearbyVenues.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {nearbyVenues.slice(0, 3).map(venue => (
                <div 
                  key={venue.id}
                  onClick={() => handleVenueClick(venue.id)}
                  className="flex-shrink-0 w-36 border rounded-md overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <div className="h-20 bg-gray-100">
                    <img 
                      src={venue.gallery_images && venue.gallery_images.length > 0 ? venue.gallery_images[0] : "/placeholder.svg"} 
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <h4 className="font-medium text-xs line-clamp-1">{venue.name}</h4>
                    <div className="flex items-center mt-1">
                      {venue.type && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {venue.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {nearbyVenues.length > 3 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-shrink-0 h-full flex items-center text-xs"
                  onClick={() => navigateToVenues()}
                >
                  +{nearbyVenues.length - 3} more
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePageMap;
