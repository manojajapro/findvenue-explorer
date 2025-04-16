import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Search, List, Grid3X3, MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import MapSearchSection from './MapSearchSection';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface HomePageMapProps {
  height?: string;
  smallView?: boolean;
}

const DEFAULT_LOCATION = {
  lat: 24.7136,
  lng: 46.6753
};

const DEFAULT_ZOOM = 13;

const HomePageMap = ({ height = '600px', smallView = false }: HomePageMapProps) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  const [selectedVenueType, setSelectedVenueType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(!smallView);
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const mapContainerStyle = {
    width: '100%',
    height: height
  };
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    id: 'google-map-script'
  });
  
  const fetchVenueTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('type')
        .not('type', 'is', null);
      
      if (error) {
        console.error('Error fetching venue types:', error);
        return;
      }
      
      const uniqueTypes = [...new Set(data
        .map(item => item.type)
        .filter(Boolean)
      )];
      
      setVenueTypes(uniqueTypes as string[]);
    } catch (error) {
      console.error('Error in fetchVenueTypes:', error);
    }
  };
  
  const fetchVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('venues')
        .select('*')
        .order('rating', { ascending: false })
        .limit(20);
      
      if (selectedVenueType && selectedVenueType !== '_all' && 
          selectedVenueType !== '_unknown' && selectedVenueType !== '_none') {
        query = query.eq('type', selectedVenueType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching venues:', error);
        return;
      }
      
      if (data) {
        const mappedVenues: Venue[] = data.map(venue => {
          const galleryImages = venue.gallery_images ? 
            (Array.isArray(venue.gallery_images) ? venue.gallery_images : [venue.gallery_images]) 
            : [];
          
          const imageUrl = galleryImages.length > 0 ? galleryImages[0] : '';
          
          const minCapacity = venue.min_capacity ? Number(venue.min_capacity) : 0;
          const maxCapacity = venue.max_capacity ? Number(venue.max_capacity) : 0;
          
          return {
            id: venue.id,
            name: venue.name,
            description: venue.description || '',
            address: venue.address,
            city: venue.city_name,
            cityId: venue.city_id,
            imageUrl,
            galleryImages,
            category: venue.category_name,
            capacity: {
              min: minCapacity,
              max: maxCapacity
            },
            pricing: {
              startingPrice: Number(venue.starting_price) || 0,
              currency: venue.currency || 'SAR'
            },
            rating: venue.rating,
            reviews: venue.reviews_count,
            featured: venue.featured,
            popular: venue.popular,
            latitude: venue.latitude,
            longitude: venue.longitude,
            type: venue.type
          };
        });
        
        setVenues(mappedVenues);
      }
    } catch (error) {
      console.error('Error in fetchVenues:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVenueType]);
  
  useEffect(() => {
    if (isLoaded) {
      fetchVenueTypes();
      fetchVenues();
    }
  }, [isLoaded, fetchVenues]);
  
  const handleVenueTypeChange = (value: string) => {
    setSelectedVenue(null);
    
    if (value === '_all') {
      setSelectedVenueType('');
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('venueType');
      setSearchParams(newSearchParams);
      return;
    }
    
    setSelectedVenueType(value);
    const newSearchParams = new URLSearchParams(searchParams);
    if (value && value !== '_unknown' && value !== '_none') {
      newSearchParams.set('venueType', value);
    } else {
      newSearchParams.delete('venueType');
    }
    setSearchParams(newSearchParams);
  };
  
  const onMarkerClick = (venue: Venue) => {
    setSelectedVenue(venue);
    
    if (map && venue.latitude && venue.longitude) {
      map.panTo({ lat: venue.latitude, lng: venue.longitude });
    }
  };
  
  const handleViewVenue = (venueId: string) => {
    navigate(`/venues/${venueId}`);
  };
  
  const onMapLoad = (map: google.maps.Map) => {
    setMap(map);
  };
  
  if (loadError) {
    return (
      <Card className="p-4">
        <p className="text-red-500">Error loading Google Maps: {loadError.message}</p>
      </Card>
    );
  }
  
  if (!isLoaded) {
    return (
      <Card className="p-4">
        <Skeleton className="h-[400px] w-full" />
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden border border-white/10 shadow-lg bg-findvenue-card-bg/50 backdrop-blur-sm">
      <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center">
          <MapIcon className="mr-2 h-5 w-5 text-findvenue" />
          <h3 className="font-semibold text-lg">Explore Venues on Map</h3>
        </div>
        
        <div className="flex items-center gap-3">
          {!smallView && (
            <Button
              variant="ghost"
              size="sm"
              className="text-findvenue-text-muted hover:text-findvenue"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Search
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Search
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-findvenue-surface/50 border-b border-white/10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <MapSearchSection variant="minimal" />
            </div>
            
            <div className="w-full md:w-64">
              <Select value={selectedVenueType} onValueChange={handleVenueTypeChange}>
                <SelectTrigger className="w-full bg-findvenue-surface/50 border-white/10">
                  <SelectValue placeholder="Filter by venue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="_all">All Venue Types</SelectItem>
                    {venueTypes && venueTypes.length > 0 ? (
                      venueTypes.map((type, index) => (
                        <SelectItem key={index} value={type || '_unknown'}>
                          {type || 'Uncategorized'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none">No venue types available</SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              {
                featureType: "all",
                elementType: "all",
                stylers: [
                  { saturation: -100 }
                ]
              }
            ]
          }}
          onLoad={onMapLoad}
        >
          {venues.map((venue) => {
            if (!venue.latitude || !venue.longitude) return null;
            
            return (
              <Marker
                key={venue.id}
                position={{ lat: venue.latitude, lng: venue.longitude }}
                onClick={() => onMarkerClick(venue)}
                icon={{
                  url: venue.featured 
                    ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(32, 32)
                }}
              />
            );
          })}
          
          {selectedVenue && selectedVenue.latitude && selectedVenue.longitude && (
            <InfoWindow
              position={{ lat: selectedVenue.latitude, lng: selectedVenue.longitude }}
              onCloseClick={() => setSelectedVenue(null)}
            >
              <div className="max-w-[300px]">
                {selectedVenue.imageUrl && (
                  <img 
                    src={selectedVenue.imageUrl}
                    alt={selectedVenue.name}
                    className="w-full h-32 object-cover rounded-t"
                  />
                )}
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900">{selectedVenue.name}</h3>
                  
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{selectedVenue.address || selectedVenue.city}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    {selectedVenue.type && (
                      <Badge className="bg-findvenue/20 text-findvenue hover:bg-findvenue/30 text-xs">
                        {selectedVenue.type}
                      </Badge>
                    )}
                    
                    <span className="text-sm font-medium">
                      {selectedVenue.pricing.startingPrice} {selectedVenue.pricing.currency}
                    </span>
                  </div>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    className="w-full mt-2 bg-findvenue hover:bg-findvenue-dark"
                    onClick={() => handleViewVenue(selectedVenue.id)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
        
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 bg-black/50 text-white p-2 text-center">
            Loading venues...
          </div>
        )}
      </div>
    </Card>
  );
};

export default HomePageMap;
