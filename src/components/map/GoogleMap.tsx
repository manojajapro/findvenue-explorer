
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';

// This should be replaced with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

// Load Google Maps script dynamically
const loadGoogleMapsScript = (callback: () => void) => {
  if (window.google && window.google.maps) {
    callback();
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
};

export interface GoogleMapProps {
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

const GoogleMap: React.FC<GoogleMapProps> = ({
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
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map
  useEffect(() => {
    setIsLoading(true);
    loadGoogleMapsScript(() => {
      setIsLoaded(true);
      setIsLoading(false);
    });
  }, []);

  // Create map when script is loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      styles: [
        {
          "elementType": "geometry",
          "stylers": [{ "color": "#242f3e" }]
        },
        {
          "elementType": "labels.text.stroke",
          "stylers": [{ "color": "#242f3e" }]
        },
        {
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#746855" }]
        },
        {
          "featureType": "administrative.locality",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#d59563" }]
        },
        {
          "featureType": "poi",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#d59563" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "geometry",
          "stylers": [{ "color": "#263c3f" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#6b9a76" }]
        },
        {
          "featureType": "road",
          "elementType": "geometry",
          "stylers": [{ "color": "#38414e" }]
        },
        {
          "featureType": "road",
          "elementType": "geometry.stroke",
          "stylers": [{ "color": "#212a37" }]
        },
        {
          "featureType": "road",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#9ca5b3" }]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry",
          "stylers": [{ "color": "#746855" }]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry.stroke",
          "stylers": [{ "color": "#1f2835" }]
        },
        {
          "featureType": "road.highway",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#f3d19c" }]
        },
        {
          "featureType": "transit",
          "elementType": "geometry",
          "stylers": [{ "color": "#2f3948" }]
        },
        {
          "featureType": "transit.station",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#d59563" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#17263c" }]
        },
        {
          "featureType": "water",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#515c6d" }]
        },
        {
          "featureType": "water",
          "elementType": "labels.text.stroke",
          "stylers": [{ "color": "#17263c" }]
        }
      ]
    });

    // Add click listener if needed
    if (onClick) {
      googleMapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && onClick) {
          onClick(e.latLng.lat(), e.latLng.lng());
        }
      });
    }

    // Clean up markers on unmount
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      infoWindowsRef.current = [];
    };
  }, [isLoaded, center, zoom, onClick]);

  // Update markers when they change
  useEffect(() => {
    if (!isLoaded || !googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
    infoWindowsRef.current = [];

    // Add new markers
    markers.forEach(marker => {
      // Create the marker
      const isHighlighted = marker.id === highlightedMarkerId;
      
      const markerInstance = new google.maps.Marker({
        position: marker.position,
        map: googleMapRef.current,
        title: marker.title,
        draggable: editable,
        animation: isHighlighted ? google.maps.Animation.BOUNCE : undefined,
        icon: marker.icon ? {
          url: marker.icon,
          scaledSize: new google.maps.Size(30, 40)
        } : isHighlighted ? {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF"
        } : undefined
      });

      markersRef.current.push(markerInstance);

      // Add drag end listener if needed
      if (editable && onMarkerDragEnd) {
        markerInstance.addListener('dragend', () => {
          const position = markerInstance.getPosition();
          if (position && onMarkerDragEnd) {
            onMarkerDragEnd(position.lat(), position.lng());
          }
        });
      }

      // Add click listener and info window if needed
      if (marker.onClick || marker.info) {
        const infoWindow = new google.maps.InfoWindow({
          content: marker.info ? 
            typeof marker.info === 'string' ? 
              marker.info : 
              // Create a container div to render React content
              (() => {
                const div = document.createElement('div');
                div.className = 'info-window-content';
                return div;
              })() : 
            undefined
        });
        
        infoWindowsRef.current.push(infoWindow);

        markerInstance.addListener('click', () => {
          // Close all other info windows
          infoWindowsRef.current.forEach(iw => iw.close());
          
          if (marker.info) {
            infoWindow.open({
              anchor: markerInstance,
              map: googleMapRef.current
            });
            
            if (marker.info && typeof marker.info !== 'string' && infoWindow.getContent()) {
              // We'll need to manually render the React content
              // This is a simplified approach - in a real app use ReactDOM.render or a portal
              const contentDiv = infoWindow.getContent() as HTMLElement;
              if (contentDiv && contentDiv.className === 'info-window-content') {
                contentDiv.innerHTML = '';
                const reactContent = document.createElement('div');
                reactContent.innerHTML = (marker.info as React.ReactElement).props.dangerouslySetInnerHTML?.__html || 'Info content';
                contentDiv.appendChild(reactContent);
              }
            }
          }
          
          if (marker.onClick) {
            marker.onClick();
          }
        });
        
        // Auto open the info window if this marker is highlighted
        if (isHighlighted) {
          infoWindow.open({
            anchor: markerInstance,
            map: googleMapRef.current
          });
        }
      }
    });
  }, [isLoaded, markers, editable, onMarkerDragEnd, highlightedMarkerId]);

  // Update center and zoom when they change
  useEffect(() => {
    if (!isLoaded || !googleMapRef.current) return;
    googleMapRef.current.setCenter(center);
    googleMapRef.current.setZoom(zoom);
  }, [isLoaded, center, zoom]);

  if (isLoading) {
    return (
      <div 
        style={{ height }}
        className={`flex items-center justify-center bg-findvenue-surface/50 ${className}`}
      >
        <Loader className="h-8 w-8 animate-spin text-findvenue" />
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      style={{ height }}
      className={`w-full rounded-md overflow-hidden ${className}`}
    />
  );
};

export default GoogleMap;
