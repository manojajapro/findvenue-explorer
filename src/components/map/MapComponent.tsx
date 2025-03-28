
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
      style: 'mapbox://styles/mapbox/dark-v11', // Using dark theme for better UI integration
      center: [center.lng, center.lat],
      zoom: zoom,
      attributionControl: false, // Disable default attribution control
      logoPosition: 'bottom-right',
    });
    
    // Add minimal navigation controls
    const navControl = new mapboxgl.NavigationControl({
      showCompass: false,
      showZoom: true,
      visualizePitch: false
    });
    mapInstance.addControl(navControl, 'bottom-right');
    map.current = mapInstance;
    
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
    
    // Add resize handler to ensure map fills container properly
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
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
        
        popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          className: 'custom-popup'
        })
          .setDOMContent(popupNode);
          
        popups.current[markerId] = popup;
      }
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      
      if (isHighlighted) {
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#4285F4';
        el.style.border = '3px solid #ffffff';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        el.style.cursor = 'pointer';
        el.style.zIndex = '10';
      } else if (marker.icon) {
        // Use custom icon if provided
        el.style.backgroundImage = `url(${marker.icon})`;
        el.style.width = '30px';
        el.style.height = '40px';
        el.style.backgroundSize = 'cover';
        el.style.cursor = 'pointer';
      } else {
        // Default marker style
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#FF6B6B';
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
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
        style={{ height, width: '100%', display: isLoading ? 'none' : 'block' }} 
        className={`rounded-md overflow-hidden ${className}`}
      />
      
      <style jsx global>{`
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
        .mapboxgl-ctrl-attrib {
          display: none !important;
        }
        .custom-popup .mapboxgl-popup-content {
          border-radius: 8px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .custom-popup .mapboxgl-popup-tip {
          border-top-color: #1F2937;
          border-bottom-color: #1F2937;
        }
        .mapboxgl-ctrl-group {
          background-color: rgba(31, 41, 55, 0.9) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          overflow: hidden !important;
        }
        .mapboxgl-ctrl-group button {
          background-color: transparent !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .mapboxgl-ctrl-group button:hover {
          background-color: rgba(255,255,255,0.1) !important;
        }
        .mapboxgl-ctrl-group button span {
          filter: invert(1);
        }
      `}</style>
    </>
  );
};

export default MapComponent;
