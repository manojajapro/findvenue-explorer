
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import GoogleMap from './GoogleMap';

export interface VenueLocationMapProps {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}

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
  
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: latitude || defaultLat,
    lng: longitude || defaultLng
  });

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      setPosition({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  const handleMapClick = (lat: number, lng: number) => {
    if (editable) {
      setPosition({ lat, lng });
      if (onLocationChange) {
        onLocationChange(lat, lng);
      }
    }
  };

  const handleMarkerDragEnd = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
  };

  const createMarkerInfo = () => {
    if (editable) return null;
    
    return (
      <div dangerouslySetInnerHTML={{ __html: `
        <div style="padding: 8px; max-width: 200px; color: #000;">
          <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          <div style="font-size: 12px;">${address}</div>
        </div>
      `}} />
    );
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
          <GoogleMap
            center={position}
            zoom={14}
            height="250px"
            markers={[
              {
                position,
                title: name,
                info: createMarkerInfo()
              }
            ]}
            onClick={handleMapClick}
            editable={editable}
            onMarkerDragEnd={handleMarkerDragEnd}
          />
          
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
