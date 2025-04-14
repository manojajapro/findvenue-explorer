
import { useState, useEffect } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Building, Search, MapPin, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useGeocode } from '@/hooks/useGeocode';
import { venues as mockVenues } from '@/data/venues';
import { supabase } from '@/integrations/supabase/client';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

interface HomePageMapProps {
  height?: string;
}

const HomePageMap = ({ height = '500px' }: HomePageMapProps) => {
  const [venues, setVenues] = useState<Venue[]>(mockVenues);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 }); // Default to Riyadh
  const [mapZoom, setMapZoom] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [venueType, setVenueType] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [realVenues, setRealVenues] = useState<Venue[]>([]);
  
  const navigate = useNavigate();
  const { geocodePinCode } = useGeocode();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Format venues to match Venue interface
          const formattedVenues = data.map(venue => ({
            id: venue.id,
            name: venue.name,
            description: venue.description,
            address: venue.address,
            city: venue.city_name,
            imageUrl: venue.image_url,
            galleryImages: venue.gallery_images,
            featured: venue.featured,
            popular: venue.popular,
            capacity: {
              min: venue.min_capacity || 0,
              max: venue.max_capacity || 100
            },
            pricing: {
              startingPrice: venue.starting_price || 0,
              currency: venue.currency || 'SAR',
              pricePerPerson: venue.price_per_person
            },
            amenities: venue.amenities || [],
            rating: venue.rating || 0,
            latitude: venue.latitude,
            longitude: venue.longitude,
            type: venue.type
          }));
          
          setRealVenues(formattedVenues);
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
        setRealVenues(mockVenues); // Fallback to mock data
      }
    };
    
    fetchVenues();
  }, []);
  
  useEffect(() => {
    // Use real venues from API if available, fallback to mock data
    setVenues(realVenues.length > 0 ? realVenues : mockVenues);
  }, [realVenues]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a location to search");
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Try to geocode the location to center the map
      const coordinates = await geocodePinCode(searchQuery.trim());
      if (coordinates) {
        setMapCenter({ lat: coordinates.lat, lng: coordinates.lng });
        setMapZoom(12);
        toast.success(`Showing venues near ${coordinates.formattedAddress}`);
      }
    } catch (error) {
      console.error("Error geocoding:", error);
      toast.error("Couldn't find that location. Showing all venues.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleVenueClick = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleVenueCardClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const filterVenues = () => {
    let filtered = [...(realVenues.length > 0 ? realVenues : mockVenues)];
    
    if (venueType && venueType !== 'all') {
      filtered = filtered.filter(venue => 
        venue.type && venue.type === venueType
      );
    }
    
    if (guestCount) {
      const guests = parseInt(guestCount);
      if (!isNaN(guests)) {
        filtered = filtered.filter(venue => 
          venue.capacity && venue.capacity.min <= guests && venue.capacity.max >= guests
        );
      }
    }
    
    setVenues(filtered);
  };
  
  useEffect(() => {
    filterVenues();
  }, [venueType, guestCount, realVenues]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const venueTypes = [
    { value: "hall", label: "Hall" },
    { value: "restaurant", label: "Restaurant" },
    { value: "hotel", label: "Hotel" },
    { value: "outdoor", label: "Outdoor" },
    { value: "lounge", label: "Lounge" },
    { value: "rooftop", label: "Rooftop" }
  ];

  return (
    <div style={{ height }} className="relative w-full rounded-lg overflow-hidden shadow-xl border border-white/10">
      <div className="absolute top-4 left-4 right-4 z-10 max-w-5xl mx-auto">
        <Card className="bg-findvenue-card-bg/80 backdrop-blur-xl p-4 shadow-lg border border-white/10 rounded-lg">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              <Input
                type="text"
                placeholder="Search venues by location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 bg-findvenue-surface/50 border-white/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
                </button>
              )}
            </div>
            
            <div className="w-full md:w-40">
              <Select value={venueType} onValueChange={setVenueType}>
                <SelectTrigger className="bg-findvenue-surface/50 border-white/10">
                  <div className="flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Venue type" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-findvenue-card-bg border-white/10">
                  <SelectItem value="all">Any type</SelectItem>
                  {venueTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-40">
              <Input
                type="number"
                placeholder="Guest count"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="bg-findvenue-surface/50 border-white/10"
              />
            </div>
            
            <Button 
              className="bg-findvenue hover:bg-findvenue-dark transition-colors"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search Map
            </Button>
          </div>
        </Card>
      </div>
      
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            styles: [
              {
                "elementType": "geometry",
                "stylers": [{"color": "#242f3e"}]
              },
              {
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#746855"}]
              },
              {
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#242f3e"}]
              },
              {
                "featureType": "administrative.locality",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#d59563"}]
              },
              {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{"visibility": "off"}]
              },
              {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#d59563"}]
              },
              {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [{"color": "#263c3f"}]
              },
              {
                "featureType": "poi.park",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#6b9a76"}]
              },
              {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{"color": "#38414e"}]
              },
              {
                "featureType": "road",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#212a37"}]
              },
              {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#9ca5b3"}]
              },
              {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{"color": "#746855"}]
              },
              {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#1f2835"}]
              },
              {
                "featureType": "road.highway",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#f3d19c"}]
              },
              {
                "featureType": "transit",
                "elementType": "geometry",
                "stylers": [{"color": "#2f3948"}]
              },
              {
                "featureType": "transit.station",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#d59563"}]
              },
              {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{"color": "#17263c"}]
              },
              {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#515c6d"}]
              },
              {
                "featureType": "water",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#17263c"}]
              }
            ]
          }}
        >
          {venues.map((venue) => {
            if (!venue.latitude || !venue.longitude) return null;
            
            return (
              <MarkerF
                key={venue.id}
                position={{ lat: venue.latitude, lng: venue.longitude }}
                onClick={() => handleVenueClick(venue)}
                icon={{
                  url: venue.featured 
                    ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(36, 36)
                }}
              />
            );
          })}
          
          {selectedVenue && selectedVenue.latitude && selectedVenue.longitude && (
            <InfoWindowF
              position={{ lat: selectedVenue.latitude, lng: selectedVenue.longitude }}
              onCloseClick={() => setSelectedVenue(null)}
            >
              <Card className="bg-white w-72 p-0 overflow-hidden">
                <div className="relative h-32 overflow-hidden">
                  {selectedVenue.imageUrl && (
                    <img 
                      src={selectedVenue.imageUrl} 
                      alt={selectedVenue.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {selectedVenue.featured && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-md leading-tight mb-1 text-gray-800">
                    {selectedVenue.name}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">
                    {selectedVenue.city || selectedVenue.address}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Up to {selectedVenue.capacity.max} guests
                  </p>
                  <p className="text-sm font-semibold mb-3 text-gray-800">
                    {selectedVenue.pricing.currency} {selectedVenue.pricing.startingPrice.toLocaleString()}
                  </p>
                  <Button 
                    className="w-full bg-findvenue hover:bg-findvenue-dark text-white"
                    size="sm"
                    onClick={() => handleVenueCardClick(selectedVenue.id)}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            </InfoWindowF>
          )}
        </GoogleMap>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-findvenue-dark-bg">
          <p className="text-findvenue-text">Loading Map...</p>
        </div>
      )}
    </div>
  );
};

export default HomePageMap;
