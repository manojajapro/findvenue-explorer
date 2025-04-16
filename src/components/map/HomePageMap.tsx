
import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useSearch } from '@/hooks/useSearch';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type HomePageMapProps = {
  height?: string;
};

const HomePageMap = ({ height = '400px' }: HomePageMapProps) => {
  const { venues, isLoading } = useSearch();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 24.7136, // Default to Saudi Arabia center
    lng: 46.6753,
  });
  const [mapZoom, setMapZoom] = useState(11);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Use the first venue with location data as map center
  useEffect(() => {
    if (venues && venues.length > 0) {
      const venuesWithCoordinates = venues.filter(venue => 
        venue.latitude && venue.longitude && 
        !isNaN(Number(venue.latitude)) && !isNaN(Number(venue.longitude))
      );
      
      if (venuesWithCoordinates.length > 0) {
        const firstVenue = venuesWithCoordinates[0];
        setMapCenter({
          lat: Number(firstVenue.latitude),
          lng: Number(firstVenue.longitude)
        });
      }
    }
  }, [venues]);

  const handleViewDetails = (venue: Venue) => {
    if (venue.id) {
      navigate(`/venue/${venue.id}`);
    }
  };

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      {
        featureType: 'all',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#7c93a3' }, { lightness: -10 }],
      },
      {
        featureType: 'administrative.country',
        elementType: 'geometry',
        stylers: [{ visibility: 'on' }],
      },
      {
        featureType: 'administrative.country',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#a0a4a5' }],
      },
      {
        featureType: 'administrative.province',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#62838e' }],
      },
      {
        featureType: 'landscape',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        featureType: 'landscape.natural',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        featureType: 'landscape.natural.terrain',
        elementType: 'geometry.fill',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'poi.business',
        elementType: 'all',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'poi.business',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry.fill',
        stylers: [{ color: '#d9e6e8' }],
      },
      {
        featureType: 'road',
        elementType: 'all',
        stylers: [{ saturation: -100 }, { lightness: 45 }],
      },
      {
        featureType: 'road.highway',
        elementType: 'all',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#c9c9c9' }],
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit',
        elementType: 'all',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'transit.station',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'water',
        elementType: 'all',
        stylers: [{ color: '#cbe9f0' }, { visibility: 'on' }],
      },
      {
        featureType: 'water',
        elementType: 'geometry.fill',
        stylers: [{ color: '#cbe9f0' }],
      },
      {
        featureType: 'water',
        elementType: 'labels.text',
        stylers: [{ visibility: 'off' }],
      },
    ],
  }), []);

  const getMarkerIcon = (venue: Venue) => {
    const defaultIcon = {
      path: "M12 0C7.31 0 3.07 2.53 3.07 7.3c0 3.17 1.97 6.72 2.37 7.4h13.12c0.4-0.67 2.37-4.23 2.37-7.4C20.93 2.53 16.69 0 12 0zm0 10c-1.1 0-2-0.9-2-2s0.9-2 2-2 2 0.9 2 2-0.9 2-2 2z",
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#000000',
      strokeWeight: 1,
      scale: 1.5,
    };
    
    // Set color based on venue type
    if (venue.category_name && Array.isArray(venue.category_name)) {
      const venueTypes = venue.category_name;
      if (venueTypes.some(type => type.toLowerCase().includes('wedding'))) {
        defaultIcon.fillColor = '#FF4081'; // Pink for wedding venues
      } else if (venueTypes.some(type => type.toLowerCase().includes('conference'))) {
        defaultIcon.fillColor = '#4CAF50'; // Green for conference venues
      } else if (venueTypes.some(type => type.toLowerCase().includes('party'))) {
        defaultIcon.fillColor = '#FF9800'; // Orange for party venues
      }
    }
    
    return defaultIcon;
  };

  return (
    <div style={{ height, width: '100%', position: 'relative', borderRadius: '0.5rem', overflow: 'hidden' }}>
      {!isLoaded || isLoading ? (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-findvenue" />
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
            center={mapCenter}
            zoom={mapZoom}
            options={mapOptions}
            onClick={() => setSelectedVenue(null)}
          >
            {venues && venues.length > 0 && venues.map((venue) => {
              if (venue.latitude && venue.longitude && !isNaN(Number(venue.latitude)) && !isNaN(Number(venue.longitude))) {
                return (
                  <Marker
                    key={venue.id}
                    position={{
                      lat: Number(venue.latitude),
                      lng: Number(venue.longitude),
                    }}
                    onClick={() => {
                      setSelectedVenue(venue);
                    }}
                    icon={getMarkerIcon(venue)}
                    title={venue.name}
                  />
                );
              }
              return null;
            })}
          </GoogleMap>

          {/* Selected venue card */}
          {selectedVenue && (
            <Card className="absolute bottom-4 left-4 right-4 max-w-sm mx-auto shadow-lg bg-white">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="font-medium text-lg">{selectedVenue.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {selectedVenue.city_name || 'Location unavailable'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedVenue.category_name && Array.isArray(selectedVenue.category_name) && selectedVenue.category_name.slice(0, 2).map((type, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full" 
                    onClick={() => setSelectedVenue(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-sm">
                    {selectedVenue.starting_price && (
                      <span className="font-medium text-findvenue">
                        {selectedVenue.currency} {selectedVenue.starting_price}
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="h-8" 
                    onClick={() => handleViewDetails(selectedVenue)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default HomePageMap;
