import { useEffect, useState, useCallback } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Search, ZoomIn, ArrowRight, Star, X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import GoogleMap from './GoogleMap';

interface MapViewProps {
  venues: Venue[];
  isLoading: boolean;
  highlightedVenueId?: string;
}

const MapSearch = ({ 
  onSearch,
  venueCount
}: { 
  onSearch: (term: string) => void;
  venueCount: number;
}) => {
  const [searchText, setSearchText] = useState('');
  const [searchParams] = useSearchParams();
  const debouncedSearchTerm = useDebounce(searchText, 500);
  
  useEffect(() => {
    // Initialize search from URL parameters
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchText(searchFromUrl);
    }
  }, [searchParams]);
  
  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);
  
  return (
    <div className="bg-findvenue-surface/90 backdrop-blur-md rounded-md overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium flex items-center">
          <MapPin className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
          {venueCount > 0 ? `${venueCount} venues on map` : 'No venues found'}
        </span>
        {searchText && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setSearchText('');
              onSearch('');
            }}
          >
            Clear <X className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSearch(searchText); }} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
        <Input
          type="text"
          placeholder="Search venues on map..."
          className="pl-10 pr-8 py-2 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {searchText && (
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
            onClick={() => {
              setSearchText('');
              onSearch('');
            }}
          >
            <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
          </button>
        )}
      </form>
    </div>
  );
};

const MapView = ({ venues, isLoading, highlightedVenueId }: MapViewProps) => {
  const navigate = useNavigate();
  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [isCompactControls, setIsCompactControls] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 24.774265, lng: 46.738586 });
  const [mapZoom, setMapZoom] = useState(5);
  
  // Filter venues with valid coordinates
  const venuesWithCoordinates = filteredVenues.filter(
    venue => venue.latitude && venue.longitude
  );
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const handleSearch = useCallback((term: string) => {
    setMapSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredVenues(venues);
      return;
    }
    
    const searchLower = term.toLowerCase();
    const results = venues.filter(venue => 
      venue.name.toLowerCase().includes(searchLower) || 
      venue.description.toLowerCase().includes(searchLower) ||
      venue.address.toLowerCase().includes(searchLower) ||
      venue.city.toLowerCase().includes(searchLower) ||
      venue.category.toLowerCase().includes(searchLower) ||
      venue.amenities.some(amenity => 
        amenity.toLowerCase().includes(searchLower)
      )
    );
    
    setFilteredVenues(results);
  }, [venues]);
  
  // Compact view toggle based on map size
  useEffect(() => {
    const handleResize = () => {
      setIsCompactControls(window.innerWidth < 768);
    };
    
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update filtered venues when main venues list changes
  useEffect(() => {
    if (!mapSearchTerm) {
      setFilteredVenues(venues);
    } else {
      handleSearch(mapSearchTerm);
    }
  }, [venues, mapSearchTerm, handleSearch]);
  
  // Update map center and zoom when venues change
  useEffect(() => {
    if (venuesWithCoordinates.length > 0) {
      // If there's a highlighted venue, center on it
      if (highlightedVenueId || activeVenue) {
        const highlightedVenue = venuesWithCoordinates.find(
          v => v.id === (highlightedVenueId || activeVenue)
        );
        
        if (highlightedVenue && highlightedVenue.latitude && highlightedVenue.longitude) {
          setMapCenter({ 
            lat: highlightedVenue.latitude, 
            lng: highlightedVenue.longitude 
          });
          setMapZoom(14);
          return;
        }
      }
      
      // Otherwise calculate bounds center
      // For simplicity, we'll just use the average of all coordinates
      const totalLat = venuesWithCoordinates.reduce(
        (sum, venue) => sum + (venue.latitude || 0), 
        0
      );
      
      const totalLng = venuesWithCoordinates.reduce(
        (sum, venue) => sum + (venue.longitude || 0), 
        0
      );
      
      setMapCenter({ 
        lat: totalLat / venuesWithCoordinates.length, 
        lng: totalLng / venuesWithCoordinates.length 
      });
      
      // Set an appropriate zoom level based on number of venues
      setMapZoom(venuesWithCoordinates.length === 1 ? 14 : 10);
    } else {
      // Default to Saudi Arabia if no venues have coordinates
      setMapCenter({ lat: 24.774265, lng: 46.738586 });
      setMapZoom(5);
    }
  }, [venuesWithCoordinates, highlightedVenueId, activeVenue]);
  
  const createMarkerInfo = (venue: Venue) => {
    return (
      <div dangerouslySetInnerHTML={{ __html: `
        <div style="padding: 0; max-width: 300px; color: #000;">
          <div style="position: relative;">
            <img 
              src="${venue.imageUrl}" 
              alt="${venue.name}"
              style="width: 100%; height: 70px; object-fit: cover; border-top-left-radius: 4px; border-top-right-radius: 4px;"
            />
            ${venue.featured ? `
              <div style="position: absolute; top: 8px; right: 8px; background-color: gold; color: black; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                Featured
              </div>
            ` : ''}
          </div>
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${venue.name}
            </h3>
            <div style="display: flex; align-items: center; font-size: 11px; color: #666; margin-bottom: 4px;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${venue.address}, ${venue.city}
              </span>
            </div>
            <div style="margin-bottom: 8px;">
              ${venue.category ? `
                <span style="display: inline-block; border: 1px solid #ddd; border-radius: 4px; padding: 0 4px; font-size: 10px; margin-right: 4px;">
                  ${venue.category}
                </span>
              ` : ''}
              ${venue.rating > 0 ? `
                <span style="display: inline-block; background-color: #f59e0b; color: black; border-radius: 4px; padding: 0 4px; font-size: 10px;">
                  ★ ${venue.rating.toFixed(1)}
                </span>
              ` : ''}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; border-top: 1px solid #eee; padding-top: 8px;">
              <div style="font-weight: 600;">
                ${venue.pricing.startingPrice} ${venue.pricing.currency}
                ${venue.pricing.pricePerPerson ? ' / person' : ''}
              </div>
              <button 
                onclick="window.location.href='/venue/${venue.id}'"
                style="background-color: #6366f1; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; display: flex; align-items: center;"
              >
                View
              </button>
            </div>
          </div>
        </div>
      `}} />
    );
  };
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-findvenue-surface/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <MapSearch onSearch={handleSearch} venueCount={venuesWithCoordinates.length} />
      </div>
      
      {venuesWithCoordinates.length === 0 ? (
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
      ) : (
        <GoogleMap
          center={mapCenter}
          zoom={mapZoom}
          height="100%"
          markers={venuesWithCoordinates.map(venue => ({
            position: { 
              lat: venue.latitude || 0, 
              lng: venue.longitude || 0 
            },
            title: venue.name,
            id: venue.id,
            onClick: () => setActiveVenue(venue.id),
            info: createMarkerInfo(venue)
          }))}
          highlightedMarkerId={highlightedVenueId || activeVenue || undefined}
          className="z-10"
        />
      )}
      
      {mapSearchTerm && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-findvenue-surface/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-lg text-xs flex items-center">
          <Filter className="h-3 w-3 mr-1.5 text-findvenue" />
          <span>Filtered: "{mapSearchTerm}"</span>
          <button onClick={() => handleSearch('')} className="ml-2 text-findvenue hover:text-findvenue-light">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      <TooltipProvider>
        <div className={`absolute ${isCompactControls ? 'bottom-4 right-4' : 'top-20 right-4'} z-[1000] flex ${isCompactControls ? 'flex-row' : 'flex-col'} gap-2`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                onClick={() => handleSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>Clear search</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                onClick={() => {
                  // Reset map zoom and center to show all venues
                  const totalLat = venuesWithCoordinates.reduce(
                    (sum, venue) => sum + (venue.latitude || 0), 
                    0
                  );
                  
                  const totalLng = venuesWithCoordinates.reduce(
                    (sum, venue) => sum + (venue.longitude || 0), 
                    0
                  );
                  
                  if (venuesWithCoordinates.length > 0) {
                    setMapCenter({ 
                      lat: totalLat / venuesWithCoordinates.length, 
                      lng: totalLng / venuesWithCoordinates.length 
                    });
                    setMapZoom(venuesWithCoordinates.length === 1 ? 14 : 10);
                  }
                }}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>Zoom to all venues</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default MapView;
