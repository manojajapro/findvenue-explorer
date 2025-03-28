
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader } from 'lucide-react';

// Mapbox access token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Check if token exists
if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token missing! Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file');
}

// Set access token
mapboxgl.accessToken = MAPBOX_TOKEN;

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popups = useRef<{ [key: string]: mapboxgl.Popup }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Create the map instance
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: zoom,
      attributionControl: false
    });
    
    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current = mapInstance;
    
    // Add attribution control
    mapInstance.addControl(new mapboxgl.AttributionControl({
      compact: true
    }));
    
    // Handle map click events
    if (onClick) {
      mapInstance.on('click', (e) => {
        onClick(e.lngLat.lat, e.lngLat.lng);
      });
    }
    
    // Wait for map to load
    mapInstance.on('load', () => {
      setIsLoading(false);
    });
    
    // Cleanup on unmount
    return () => {
      mapInstance.remove();
    };
  }, []);
  
  // Update center and zoom when props change
  useEffect(() => {
    if (!map.current) return;
    
    map.current.setCenter([center.lng, center.lat]);
    map.current.setZoom(zoom);
  }, [center.lat, center.lng, zoom]);
  
  // Handle markers
  useEffect(() => {
    if (!map.current) return;
    
    // Clear existing markers
    Object.values(mapMarkers.current).forEach(marker => marker.remove());
    mapMarkers.current = {};
    
    // Clear existing popups
    Object.values(popups.current).forEach(popup => popup.remove());
    popups.current = {};
    
    // Add new markers
    markers.forEach((marker, idx) => {
      const markerId = marker.id || `marker-${idx}`;
      const isHighlighted = marker.id === highlightedMarkerId;
      
      // Create popup if marker has info
      let popup: mapboxgl.Popup | null = null;
      if (marker.info) {
        // Create a temporary DOM element to render React node
        const popupNode = document.createElement('div');
        
        // Create a ReactDOM render function (simplified for this example)
        const renderReactNodeToString = (reactNode: React.ReactNode): string => {
          if (typeof reactNode === 'string') return reactNode;
          return '<div class="mapbox-popup-content">Info available on click</div>';
        };
        
        popupNode.innerHTML = renderReactNodeToString(marker.info);
        
        popup = new mapboxgl.Popup({ offset: 25 })
          .setDOMContent(popupNode);
          
        popups.current[markerId] = popup;
      }
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      
      if (isHighlighted) {
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#4285F4';
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
      } else if (marker.icon) {
        // Use custom icon if provided
        el.style.backgroundImage = `url(${marker.icon})`;
        el.style.width = '30px';
        el.style.height = '40px';
        el.style.backgroundSize = 'cover';
      } else {
        // Default marker style
        el.style.width = '20px';
        el.style.height = '30px';
        el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/pin.png)';
        el.style.backgroundSize = 'cover';
      }
      
      // Create the marker
      const markerObj = new mapboxgl.Marker({
        element: el,
        draggable: editable
      })
        .setLngLat([marker.position.lng, marker.position.lat]);
      
      // Add popup if exists
      if (popup) {
        markerObj.setPopup(popup);
      }
      
      // Add to map
      markerObj.addTo(map.current!);
      
      // Add click handler
      if (marker.onClick) {
        el.addEventListener('click', () => {
          marker.onClick?.();
        });
      }
      
      // Add drag end handler
      if (editable && onMarkerDragEnd) {
        markerObj.on('dragend', () => {
          const { lng, lat } = markerObj.getLngLat();
          onMarkerDragEnd(lat, lng);
        });
      }
      
      // Store marker reference
      mapMarkers.current[markerId] = markerObj;
    });
    
  }, [markers, highlightedMarkerId, editable, onMarkerDragEnd]);
  
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
      
      <div 
        ref={mapContainer} 
        style={{ height, display: isLoading ? 'none' : 'block' }} 
        className={`w-full rounded-md overflow-hidden ${className}`}
      />
    </>
  );
};

export default MapComponent;
