
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import L from 'leaflet';

// Fix for marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for highlighted venue
const highlightedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  venues: Venue[];
  isLoading: boolean;
  highlightedVenueId?: string;
}

// Component to update map view when props change
const MapUpdater = ({ venues }: { venues: Venue[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (venues.length > 0) {
      // Get venues with coordinates
      const venuesWithCoords = venues.filter(
        venue => venue.latitude && venue.longitude
      );
      
      if (venuesWithCoords.length > 0) {
        // Create bounds from all venue coordinates
        const bounds = L.latLngBounds(
          venuesWithCoords.map(venue => [
            venue.latitude || 24.774265, 
            venue.longitude || 46.738586
          ])
        );
        
        // Fit map to these bounds
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        // Default to Saudi Arabia if no venues have coordinates
        map.setView([24.774265, 46.738586], 5);
      }
    }
  }, [venues, map]);
  
  return null;
};

const MapView = ({ venues, isLoading, highlightedVenueId }: MapViewProps) => {
  const navigate = useNavigate();
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  
  // Filter venues with valid coordinates
  const venuesWithCoordinates = venues.filter(
    venue => venue.latitude && venue.longitude
  );
  
  // Default center on Saudi Arabia
  const defaultCenter: [number, number] = [24.774265, 46.738586];
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue"></div>
      </div>
    );
  }
  
  if (venuesWithCoordinates.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50 p-6 text-center">
        <div>
          <MapPin className="h-12 w-12 mx-auto mb-4 text-findvenue-text-muted opacity-50" />
          <h3 className="text-xl font-medium mb-2">No Venues Found</h3>
          <p className="text-findvenue-text-muted">
            We couldn't find any venues matching your criteria with map coordinates.
            Try adjusting your search filters or switching to list view.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={5} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <MapUpdater venues={venuesWithCoordinates} />
      
      {venuesWithCoordinates.map((venue) => (
        <Marker 
          key={venue.id}
          position={[venue.latitude || 0, venue.longitude || 0]}
          icon={venue.id === highlightedVenueId || venue.id === activeVenue ? highlightedIcon : L.Icon.Default.prototype}
          eventHandlers={{
            click: () => setActiveVenue(venue.id),
          }}
        >
          <Popup minWidth={200} maxWidth={300}>
            <div className="text-black">
              <div className="mb-2">
                <img 
                  src={venue.imageUrl} 
                  alt={venue.name}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
                <h3 className="font-bold text-base">{venue.name}</h3>
                <p className="text-sm text-gray-600">{venue.address}, {venue.city}</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-semibold">{venue.pricing.startingPrice} {venue.pricing.currency}</span>
                  {venue.pricing.pricePerPerson && <span> / person</span>}
                </div>
                <Button 
                  size="sm" 
                  className="bg-findvenue hover:bg-findvenue-dark text-xs px-3 py-1.5 h-auto"
                  onClick={() => handleVenueClick(venue.id)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
