
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix the default icon issue in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to update the map view when center/zoom props change
const MapUpdater = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

// Component to handle map click events
const MapClickHandler = ({ onClick }: { onClick?: (lat: number, lng: number) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!onClick) return;
    
    const handleClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick]);
  
  return null;
};

export interface MapComponentProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    icon?: string;
    id?: string;
    onClick?: () => void;
    info?: React.ReactNode;
  }>;
  height?: string;
  onClick?: (lat: number, lng: number) => void;
  editable?: boolean;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  highlightedMarkerId?: string;
  className?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom = 14,
  markers = [],
  height = '400px',
  onClick,
  editable = false,
  onMarkerDragEnd,
  highlightedMarkerId,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && (
        <div 
          style={{ height }}
          className={`flex items-center justify-center bg-findvenue-surface/50 ${className}`}
        >
          <Loader className="h-8 w-8 animate-spin text-findvenue" />
        </div>
      )}
      
      <div style={{ height, display: isLoading ? 'none' : 'block' }} className={`w-full rounded-md overflow-hidden ${className}`}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
          whenReady={() => setIsLoading(false)}
        >
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater center={[center.lat, center.lng]} zoom={zoom} />
          {onClick && <MapClickHandler onClick={onClick} />}
          
          {markers.map((marker, idx) => {
            const isHighlighted = marker.id === highlightedMarkerId;
            const markerIcon = isHighlighted 
              ? L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })
              : marker.icon 
                ? L.icon({
                    iconUrl: marker.icon,
                    iconSize: [30, 40],
                    iconAnchor: [15, 40],
                    popupAnchor: [0, -40]
                  })
                : DefaultIcon;
                
            return (
              <Marker
                key={`marker-${idx}`}
                position={[marker.position.lat, marker.position.lng]}
                draggable={editable}
                icon={markerIcon}
                eventHandlers={{
                  click: () => {
                    if (marker.onClick) marker.onClick();
                  },
                  dragend: (e) => {
                    if (onMarkerDragEnd) {
                      const latLng = e.target.getLatLng();
                      onMarkerDragEnd(latLng.lat, latLng.lng);
                    }
                  }
                }}
              >
                {marker.info && (
                  <Popup>
                    {marker.info}
                  </Popup>
                )}
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
};

export default MapComponent;
