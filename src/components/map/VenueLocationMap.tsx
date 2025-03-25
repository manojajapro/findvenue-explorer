
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix for marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VenueLocationMapProps {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

const VenueLocationMap = ({ name, address, latitude, longitude }: VenueLocationMapProps) => {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Default to Riyadh coordinates if venue doesn't have coordinates
  const defaultLat = 24.774265;
  const defaultLng = 46.738586;
  
  const position: [number, number] = [
    latitude || defaultLat,
    longitude || defaultLng
  ];

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

  return (
    <div className="bg-findvenue-card-bg rounded-lg overflow-hidden border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-findvenue" />
          Location
        </h3>
      </div>
      
      {!latitude || !longitude ? (
        <div className="p-6 text-center text-findvenue-text-muted">
          <p>Exact location will be provided after booking.</p>
        </div>
      ) : (
        <div className="h-[250px] w-full relative">
          <MapContainer 
            style={{ height: '100%', width: '100%', background: '#1e2734' }}
            className="z-10"
            whenCreated={(map) => {
              mapRef.current = map;
              map.setView(position, 14);
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              /* @ts-ignore - The type definitions seem incorrect but this works */
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={position}>
              <Popup>
                <div className="text-black">
                  <strong>{name}</strong><br/>
                  {address}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
          
          <div className="p-3 bg-findvenue-card-bg/70 backdrop-blur-sm absolute bottom-0 left-0 right-0 text-sm z-[400]">
            {address}
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueLocationMap;
