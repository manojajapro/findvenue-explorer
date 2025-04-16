
import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { supabase } from '@/integrations/supabase/client';
import LocationSearchInput from './LocationSearchInput';
import MapControls from './MapControls'; // Fixed import
import { Venue } from '@/hooks/useSupabaseVenues';

const defaultCenter = { lat: 24.7136, lng: 46.6753 }; // Default to Riyadh, Saudi Arabia

interface HomePageMapProps {
  height?: string;
  defaultZoom?: number;
}

// Extended the Venue type to include the distance property
type VenueWithDistance = Venue & { 
  distance?: number;
  // Add missing properties from the database schema that aren't in the Venue interface
  city_name?: string;
  category_name?: string | string[];
  reviews_count?: number;
  starting_price?: number;
  currency?: string;
};

// Function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const HomePageMap: React.FC<HomePageMapProps> = ({ height = '500px', defaultZoom = 10 }) => {
  const { venues, isLoading } = useSearch();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(defaultZoom);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithDistance | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyVenues, setNearbyVenues] = useState<VenueWithDistance[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [mapVenues, setMapVenues] = useState<VenueWithDistance[]>([]);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Get user's location if permission is granted
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setCenter(location);
        },
        (error) => {
          console.error('Error getting geolocation:', error);
        }
      );
    }
  }, []);

  // Load venues from Supabase if empty
  useEffect(() => {
    const fetchVenues = async () => {
      if (!isLoading && venues.length === 0) {
        try {
          const { data, error } = await supabase
            .from('venues')
            .select('*')
            .limit(20);

          if (error) {
            console.error('Error fetching venues:', error);
            return;
          }

          if (data) {
            setMapVenues(data as VenueWithDistance[]);
          }
        } catch (err) {
          console.error('Error fetching venues:', err);
        }
      } else if (!isLoading && venues.length > 0) {
        setMapVenues(venues as VenueWithDistance[]);
      }
    };

    fetchVenues();
  }, [isLoading, venues]);

  // Calculate nearby venues when user location or venues change
  useEffect(() => {
    if (userLocation && mapVenues.length > 0) {
      const venuesWithDistance = mapVenues.map(venue => {
        if (venue.latitude && venue.longitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(venue.latitude),
            Number(venue.longitude)
          );
          return { ...venue, distance };
        }
        return venue;
      });

      // Filter venues with valid coordinates and sort by distance
      const filtered = venuesWithDistance
        .filter(venue => venue.distance !== undefined)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setNearbyVenues(filtered.slice(0, 5)); // Take top 5 nearest venues
    }
  }, [userLocation, mapVenues]);

  const onLoad = React.useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (venue: VenueWithDistance) => {
    setSelectedVenue(venue);
    setCenter({ lat: Number(venue.latitude), lng: Number(venue.longitude) });
    setZoom(15);
  };

  const handleCloseInfoCard = () => {
    setSelectedVenue(null);
    setZoom(defaultZoom);
  };

  const validVenues = useMemo(() => {
    return mapVenues.filter(venue => 
      venue.latitude && venue.longitude && 
      !isNaN(Number(venue.latitude)) && !isNaN(Number(venue.longitude))
    );
  }, [mapVenues]);

  const containerStyle = {
    width: '100%',
    height,
    borderRadius: '0.75rem',
  };

  // Update LocationSearchInput to pass appropriate props
  const handleLocationChange = (latLng: any) => {
    if (latLng) {
      setCenter(latLng);
      setZoom(15);
    }
  };

  if (!isLoaded) {
    return <div style={{...containerStyle, background: '#f0f0f0'}} className="flex items-center justify-center">Loading Map...</div>;
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {validVenues.map((venue) => (
          <MarkerF
            key={venue.id}
            position={{
              lat: Number(venue.latitude),
              lng: Number(venue.longitude),
            }}
            onClick={() => handleMarkerClick(venue)}
            icon={{
              url: '/lovable-uploads/25610b8c-bf06-4ae3-8110-9c4e8133a31b.png',
              scaledSize: new window.google.maps.Size(35, 35),
            }}
          />
        ))}

        {userLocation && (
          <MarkerF
            position={userLocation}
            icon={{
              url: '/lovable-uploads/545c1cde-048c-4d24-a229-8931fc3147c8.png',
              scaledSize: new window.google.maps.Size(25, 25),
            }}
          />
        )}
      </GoogleMap>

      {/* Search and controls */}
      <div className="absolute top-4 left-4 w-64 z-10">
        <LocationSearchInput 
          onPlaceSelected={handleLocationChange}
        />
      </div>

      <MapControls
        onNearbyToggle={() => setShowNearby(!showNearby)}
        showNearby={showNearby}
        isCompactControls={false}
        isRadiusActive={false}
        toggleRadiusSearch={() => {}}
        handleManualLocationSetting={() => {}}
        fitBoundsToMarkers={() => {}}
        resetToDefaultLocation={() => {}}
      />

      {/* Selected venue info */}
      {selectedVenue && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
          <Card className="shadow-lg border border-gray-200">
            <CardHeader className="pb-2 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedVenue.name}</CardTitle>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin size={14} />
                  <span className="truncate max-w-[200px]">
                    {selectedVenue.address || selectedVenue.city_name || 'Location not specified'}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {selectedVenue.category_name && Array.isArray(selectedVenue.category_name) ? 
                    selectedVenue.category_name[0] : 'Venue'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Star size={16} className="text-yellow-500 mr-1" />
                  <span className="font-semibold">
                    {selectedVenue.rating || 'New'} 
                    {selectedVenue.reviews_count ? ` (${selectedVenue.reviews_count})` : ''}
                  </span>
                </div>
                <div className="text-sm">
                  {selectedVenue.starting_price ? (
                    <span className="font-semibold">{selectedVenue.currency || 'SAR'} {selectedVenue.starting_price}</span>
                  ) : 'Price upon request'}
                </div>
              </div>
              <p className="text-sm line-clamp-2 text-gray-600">
                {selectedVenue.description || 'No description available'}
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex justify-between">
              <Button variant="outline" size="sm" onClick={handleCloseInfoCard}>
                Close
              </Button>
              <Button asChild size="sm">
                <Link to={`/venue/${selectedVenue.id}`}>
                  View Details
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Nearby venues panel */}
      {showNearby && userLocation && (
        <div className="absolute right-4 top-20 w-64 bg-white rounded-md shadow-lg p-3 max-h-96 overflow-auto">
          <h3 className="font-semibold mb-2">Venues Near You</h3>
          {nearbyVenues.length > 0 ? (
            <div className="space-y-2">
              {nearbyVenues.map((venue) => (
                <div 
                  key={venue.id} 
                  className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleMarkerClick(venue)}
                >
                  <p className="font-medium text-sm truncate">{venue.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {venue.category_name && Array.isArray(venue.category_name) ? venue.category_name[0] : ''}
                    </p>
                    <p className="text-xs font-medium">
                      {venue.distance ? `${venue.distance.toFixed(1)} km` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No nearby venues found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePageMap;
