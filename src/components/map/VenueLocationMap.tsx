
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import { Button } from '@/components/ui/button';

// Fix for marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface VenueLocationMapProps {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}

// Component to handle map clicks for editable maps
const LocationMarker = ({ 
  position, 
  setPosition, 
  editable 
}: { 
  position: [number, number], 
  setPosition: (pos: [number, number]) => void,
  editable: boolean
}) => {
  const map = useMapEvents({
    click(e) {
      if (editable) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return (
    <Marker position={position} draggable={editable} 
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          setPosition([position.lat, position.lng]);
        },
      }}
    />
  );
};

const VenueLocationMap = ({ 
  name, 
  address, 
  latitude, 
  longitude, 
  editable = false,
  onLocationChange 
}: VenueLocationMapProps) => {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Default to Riyadh coordinates if venue doesn't have coordinates
  const defaultLat = 24.774265;
  const defaultLng = 46.738586;
  
  const [position, setPosition] = useState<[number, number]>([
    latitude || defaultLat,
    longitude || defaultLng
  ]);

  useEffect(() => {
    // This ensures the map is properly sized after it's rendered
    const timeout = setTimeout(() => {
      setMapReady(true);
      // Update the map view if we have a map instance
      if (mapRef.current) {
        mapRef.current.setView(position, 14);
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [position]);

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // When position changes in editable mode, notify parent
  useEffect(() => {
    if (editable && onLocationChange) {
      onLocationChange(position[0], position[1]);
    }
  }, [position, editable, onLocationChange]);

  // Function to handle map ready event
  const handleMapReady = () => {
    // We'll use the ref to access the map instance later
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setView(position, 14);
      }
    }, 100);
  };

  const handleMarkerPositionChange = (newPosition: [number, number]) => {
    setPosition(newPosition);
    if (onLocationChange) {
      onLocationChange(newPosition[0], newPosition[1]);
    }
  };

  return (
    <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-findvenue" />
          Location
        </h3>
      </div>
      
      {!latitude && !longitude && !editable ? (
        <div className="p-6 text-center text-findvenue-text-muted">
          <p>Exact location will be provided after booking.</p>
        </div>
      ) : (
        <div className="h-[250px] w-full relative">
          {mapReady && (
            <MapContainer 
              style={{ height: '100%', width: '100%', background: '#1e2734' }}
              className="z-10"
              center={position}
              zoom={14}
              ref={mapRef}
              whenReady={handleMapReady}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              <LocationMarker 
                position={position} 
                setPosition={handleMarkerPositionChange}
                editable={editable} 
              />
              
              {!editable && (
                <Marker position={position}>
                  <Popup>
                    <div className="text-black">
                      <strong>{name}</strong><br/>
                      {address}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}
          
          <div className="p-3 bg-findvenue-card-bg/70 backdrop-blur-sm absolute bottom-0 left-0 right-0 text-sm z-[400]">
            {editable ? (
              <div className="flex justify-between items-center">
                <span>Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}</span>
                <span className="text-xs text-findvenue-text-muted">
                  {editable ? 'Click on map or drag marker to set location' : address}
                </span>
              </div>
            ) : (
              address
            )}
          </div>
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
