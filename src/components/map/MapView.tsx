import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MapPin, Ruler, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MapViewProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  name?: string;
}

const darkModeMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d0d0d0' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
];

const lightModeMapStyle = [];

const MapView: React.FC<MapViewProps> = ({ address, latitude, longitude, editable = false, onLocationChange, name = "Venue Location" }) => {
  const { isDarkMode } = useDarkMode();
  const { toast } = useToast();
  const [center, setCenter] = useState({ lat: 25.000, lng: 45.000 });
  const [zoom, setZoom] = useState(5);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isDrawingRadius, setIsDrawingRadius] = useState(false);
  const [radius, setRadius] = useState(500); // Default radius in meters
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.375rem',
  };

  const loadMap = useCallback(() => {
    if (latitude && longitude) {
      setCenter({ lat: latitude, lng: longitude });
      setMarkerPosition({ lat: latitude, lng: longitude });
      setZoom(15);
    } else {
      geocodeAddress(address);
    }
  }, [address, latitude, longitude]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const geocodeAddress = (address: string) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        setCenter({ lat, lng });
        setMarkerPosition({ lat, lng });
        setZoom(15);
        if (onLocationChange) {
          onLocationChange(lat, lng);
        }
      } else {
        console.error('Geocoding failed:', status);
        toast({
          title: 'Error',
          description: 'Could not geocode the address. Please enter a valid address.',
          variant: 'destructive',
        });
      }
    });
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
    setIsMapLoaded(false);
  }, []);

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (editable && isMapLoaded) {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();

      if (lat && lng) {
        setMarkerPosition({ lat, lng });
        setCenter({ lat, lng });
        if (onLocationChange) {
          onLocationChange(lat, lng);
        }
      }
    }
  }, [editable, isMapLoaded, onLocationChange]);

  const handleRadiusChange = (values: number[]) => {
    setRadius(values[0]);
  };

  const toggleDrawingRadius = () => {
    setIsDrawingRadius(!isDrawingRadius);
  };

  useEffect(() => {
    if (editable && isMapLoaded) {
      autocompleteRef.current = new google.maps.places.Autocomplete(
        addressInputRef.current as HTMLInputElement,
        { types: ['address'] }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.geometry) {
          console.error('Place details not found for', place?.name);
          toast({
            title: 'Error',
            description: 'No details available for the selected place.',
            variant: 'destructive',
          });
          return;
        }

        const lat = place.geometry.location?.lat();
        const lng = place.geometry.location?.lng();

        if (lat && lng) {
          setCenter({ lat, lng });
          setMarkerPosition({ lat, lng });
          setZoom(15);
          if (onLocationChange) {
            onLocationChange(lat, lng);
          }
        }
      });
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [editable, isMapLoaded, onLocationChange, toast]);

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
      libraries={["places"]}
    >
      <div className="relative">
        {editable && (
          <div className="absolute top-4 left-4 z-10 w-full max-w-md">
            <input
              ref={addressInputRef}
              type="text"
              placeholder="Enter address"
              className="w-full p-2 rounded-md shadow-md text-black"
            />
          </div>
        )}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          onClick={handleMapClick}
          options={{
            styles: isDarkMode ? darkModeMapStyle : lightModeMapStyle,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={editable}
              onDragEnd={(event: google.maps.MapMouseEvent) => {
                if (editable) {
                  const lat = event.latLng?.lat();
                  const lng = event.latLng?.lng();

                  if (lat && lng) {
                    setMarkerPosition({ lat, lng });
                    setCenter({ lat, lng });
                    if (onLocationChange) {
                      onLocationChange(lat, lng);
                    }
                  }
                }
              }}
            />
          )}
          {isDrawingRadius && markerPosition && (
            <Circle
              center={markerPosition}
              radius={radius}
              options={{
                fillColor: '#FF0000',
                fillOpacity: 0.2,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
        {editable && (
          <div className="absolute bottom-4 left-4 z-10 p-4 bg-white/70 dark:bg-black/70 rounded-md shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Radius: {radius} meters</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDrawingRadius}
                className="h-8 w-8"
              >
                {isDrawingRadius ? <X className="h-4 w-4" /> : <Ruler className="h-4 w-4" />}
              </Button>
            </div>
            {isDrawingRadius && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <Slider
                  defaultValue={[radius]}
                  max={2000}
                  step={100}
                  onValueChange={handleRadiusChange}
                  disabled={!isDrawingRadius}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </LoadScript>
  );
};

export default MapView;
