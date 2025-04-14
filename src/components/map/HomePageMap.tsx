
import { useState, useEffect, useCallback } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF } from '@react-google-maps/api';
import { Building, Search, MapPin, X, Target, Locate, Filter } from 'lucide-react';
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
import EnhancedMapSearch from './EnhancedMapSearch';
import LocationSearchInput from './LocationSearchInput';

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
  
  // Radius search state
  const [radiusInKm, setRadiusInKm] = useState(5);
  const [isRadiusActive, setIsRadiusActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [filteredByRadius, setFilteredByRadius] = useState<Venue[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const { geocodePinCode, isLoading: isGeocodingLoading } = useGeocode();
  
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
            imageUrl: venue.image_url || (venue.gallery_images && venue.gallery_images.length > 0 ? venue.gallery_images[0] : ''),
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
            type: venue.type || '', // Ensure type is always defined
            cityId: venue.city_id || '',
            category: venue.category_name || [],
            categoryId: venue.category_id || [],
            reviews: venue.reviews_count || 0
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

  // Calculate distance between two coordinates in km using the Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Filter venues by radius around a point
  const filterByRadius = useCallback(() => {
    if (!userLocation || !isRadiusActive) {
      setFilteredByRadius([]);
      return;
    }

    const filtered = venues.filter(venue => {
      if (!venue.latitude || !venue.longitude) return false;
      
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        venue.latitude,
        venue.longitude
      );
      
      return distance <= radiusInKm;
    });
    
    setFilteredByRadius(filtered);
    toast.success(`Found ${filtered.length} venues within ${radiusInKm}km radius`);
  }, [userLocation, radiusInKm, venues, isRadiusActive]);

  // Update filtered venues when radius or location changes
  useEffect(() => {
    filterByRadius();
  }, [filterByRadius, userLocation, radiusInKm, isRadiusActive]);

  // Get current user location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Getting your current location...");
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setUserLocation(currentLocation);
          setMapCenter(currentLocation);
          setMapZoom(13);
          setIsRadiusActive(true);
          
          // Add "Current Location" to applied filters if not already there
          if (!appliedFilters.includes("Current Location")) {
            setAppliedFilters([...appliedFilters.filter(f => f !== "Current Location"), "Current Location"]);
          }
          
          toast.success("Location found! Showing venues nearby.");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Couldn't access your location. Please check your browser settings.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  // Set manual location by clicking on map
  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!isRadiusActive) return;
    
    const clickedLocation = {
      lat: event.latLng?.lat() || 0,
      lng: event.latLng?.lng() || 0
    };
    
    setUserLocation(clickedLocation);
    toast.success("Location updated! Showing venues nearby.");
  };

  // Set location from search
  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    const newLocation = { lat, lng };
    setUserLocation(newLocation);
    setMapCenter(newLocation);
    setMapZoom(13);
    setIsRadiusActive(true);
    
    // Add location to applied filters if not already there
    const filterName = `Location: ${address.split(',')[0]}`;
    if (!appliedFilters.includes(filterName)) {
      setAppliedFilters([...appliedFilters.filter(f => f.startsWith("Location:")), filterName]);
    }
  };

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
        
        // Set user location for radius search
        setUserLocation({ lat: coordinates.lat, lng: coordinates.lng });
        setIsRadiusActive(true);
        
        // Add location to applied filters
        const filterName = `Location: ${coordinates.formattedAddress.split(',')[0]}`;
        if (!appliedFilters.includes(filterName)) {
          setAppliedFilters([...appliedFilters.filter(f => f.startsWith("Location:")), filterName]);
        }
        
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
      
      // Add venue type to applied filters if not already there
      const filterName = `Type: ${venueType}`;
      if (!appliedFilters.includes(filterName)) {
        setAppliedFilters([...appliedFilters.filter(f => !f.startsWith("Type:")), filterName]);
      }
    } else {
      // Remove venue type from applied filters
      setAppliedFilters(appliedFilters.filter(f => !f.startsWith("Type:")));
    }
    
    if (guestCount) {
      const guests = parseInt(guestCount);
      if (!isNaN(guests)) {
        filtered = filtered.filter(venue => 
          venue.capacity && venue.capacity.min <= guests && venue.capacity.max >= guests
        );
        
        // Add guest count to applied filters if not already there
        const filterName = `Guests: ${guests}`;
        if (!appliedFilters.includes(filterName)) {
          setAppliedFilters([...appliedFilters.filter(f => !f.startsWith("Guests:")), filterName]);
        }
      }
    } else {
      // Remove guest count from applied filters
      setAppliedFilters(appliedFilters.filter(f => !f.startsWith("Guests:")));
    }
    
    setVenues(filtered);
  };
  
  useEffect(() => {
    filterVenues();
  }, [venueType, guestCount, realVenues]);
  
  // Clear a specific filter
  const handleClearFilter = (filter: string) => {
    if (filter.startsWith("Type:")) {
      setVenueType('');
    } else if (filter.startsWith("Guests:")) {
      setGuestCount('');
    } else if (filter.startsWith("Location:") || filter === "Current Location") {
      setIsRadiusActive(false);
      setUserLocation(null);
    }
    
    setAppliedFilters(appliedFilters.filter(f => f !== filter));
  };
  
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

  // Display venues based on radius search if active, otherwise show all venues
  const displayVenues = isRadiusActive && userLocation ? filteredByRadius : venues;

  return (
    <div style={{ height }} className="relative w-full rounded-lg overflow-hidden shadow-xl border border-white/10">
      <div className="absolute top-4 left-4 right-4 z-10 max-w-5xl mx-auto">
        <Card className="bg-findvenue-card-bg/80 backdrop-blur-xl p-4 shadow-lg border border-white/10 rounded-lg">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <LocationSearchInput 
                onSearch={setSearchQuery} 
                onLocationSelect={handleLocationSelect}
                searchText={searchQuery}
                setSearchText={setSearchQuery}
              />
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
            
            <Button 
              className={`${isRadiusActive ? 'bg-findvenue-dark' : 'bg-findvenue-surface/50'} hover:bg-findvenue-dark transition-colors`}
              onClick={() => {
                if (!isRadiusActive) {
                  setIsRadiusActive(true);
                  if (!userLocation) {
                    getCurrentLocation();
                  }
                } else {
                  setIsRadiusActive(false);
                  setAppliedFilters(appliedFilters.filter(f => !f.startsWith("Location:") && f !== "Current Location"));
                }
              }}
            >
              <Target className="w-4 h-4 mr-2" />
              {isRadiusActive ? 'Disable Radius' : 'Enable Radius'}
            </Button>
          </div>
          
          {/* Enhanced Map Search Controls */}
          {isRadiusActive && (
            <div className="mt-3">
              <EnhancedMapSearch
                onSearch={setSearchQuery}
                onLocationSelect={handleLocationSelect}
                onRadiusChange={setRadiusInKm}
                onManualLocation={() => toast.info("Click anywhere on the map to set your location")}
                onCurrentLocation={getCurrentLocation}
                venueCount={filteredByRadius.length}
                radiusInKm={radiusInKm}
                isRadiusActive={isRadiusActive}
                searchText={searchQuery}
                setSearchText={setSearchQuery}
                appliedFilters={appliedFilters}
                onClearFilter={handleClearFilter}
              />
            </div>
          )}
        </Card>
      </div>
      
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onClick={handleMapClick}
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
                "stylers": [{"color": "#212835"}]
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
          {/* Draw radius circle if radius search is active */}
          {isRadiusActive && userLocation && (
            <CircleF
              center={userLocation}
              radius={radiusInKm * 1000} // Convert km to meters
              options={{
                fillColor: '#4f46e5',
                fillOpacity: 0.15,
                strokeColor: '#4f46e5',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}
          
          {/* Draw user location marker if radius search is active */}
          {isRadiusActive && userLocation && (
            <MarkerF
              position={userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: '#4f46e5',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />
          )}
          
          {displayVenues.map((venue) => {
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
