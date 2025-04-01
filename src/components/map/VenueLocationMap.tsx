
import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VenueLocationMapProps {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}

const containerStyle = {
  width: '100%',
  height: '250px'
};

const VenueLocationMap = ({ 
  name, 
  address, 
  latitude, 
  longitude, 
  editable = false,
  onLocationChange 
}: VenueLocationMapProps) => {
  // Default to Riyadh coordinates if venue doesn't have coordinates
  const defaultLat = 24.774265;
  const defaultLng = 46.738586;
  
  const [position, setPosition] = useState<google.maps.LatLngLiteral>({
    lat: latitude || defaultLat,
    lng: longitude || defaultLng
  });

  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Load the Google Maps JS API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: 'google-map-script'
  });

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      setPosition({
        lat: latitude,
        lng: longitude
      });
    }
  }, [latitude, longitude]);

  // When position changes in editable mode, notify parent
  useEffect(() => {
    if (editable && onLocationChange && mapLoaded) {
      onLocationChange(position.lat, position.lng);
    }
  }, [position, editable, onLocationChange, mapLoaded]);

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
    }
  }, [editable]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (editable && e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setPosition(newPosition);
    }
  }, [editable]);

  if (loadError) {
    return (
      <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-findvenue" />
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
            <MapPin className="w-4 h-4 mr-2 text-findvenue" />
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
            <MapPin className="w-4 h-4 mr-2 text-findvenue" />
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
          <MapPin className="w-4 h-4 mr-2 text-findvenue" />
          Location
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
          <Marker
            position={position}
            draggable={editable}
            onDragEnd={handleMarkerDragEnd}
            onClick={() => setInfoWindowOpen(true)}
          >
            {!editable && infoWindowOpen && (
              <InfoWindow
                position={position}
                onCloseClick={() => setInfoWindowOpen(false)}
              >
                <div className="text-black p-1">
                  <strong>{name}</strong><br/>
                  {address}
                </div>
              </InfoWindow>
            )}
          </Marker>
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
            address
          )}
        </div>
      </div>
      
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
