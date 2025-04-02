
import { useState, useEffect } from 'react';
import { MapPin, X, Filter, Ruler, Search as SearchIcon, MapIcon, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Venue } from '@/hooks/useSupabaseVenues';
import LocationSearchInput from './LocationSearchInput';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useGeocode } from '@/hooks/useGeocode';
import { toast } from 'sonner';

interface EnhancedMapSearchProps {
  onSearch: (term: string) => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onRadiusChange: (value: number) => void;
  onManualLocation: () => void;
  onCurrentLocation: () => void;
  venueCount: number;
  radiusInKm: number;
  isRadiusActive: boolean;
  searchText: string;
  setSearchText: (text: string) => void;
  appliedFilters: string[];
  onClearFilter: (filter: string) => void;
}

const EnhancedMapSearch = ({
  onSearch,
  onLocationSelect,
  onRadiusChange,
  onManualLocation,
  onCurrentLocation,
  venueCount,
  radiusInKm,
  isRadiusActive,
  searchText,
  setSearchText,
  appliedFilters,
  onClearFilter
}: EnhancedMapSearchProps) => {
  const [searchParams] = useSearchParams();
  const [pinCode, setPinCode] = useState('');
  const [showPinCodeSearch, setShowPinCodeSearch] = useState(false);
  const { geocodePinCode, isLoading: isGeocodingLoading } = useGeocode();
  
  // Initialize search text from URL if available
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl && !searchText) {
      setSearchText(searchFromUrl);
      onSearch(searchFromUrl);
    }
  }, [searchParams, searchText, setSearchText, onSearch]);
  
  const handlePinCodeSearch = async () => {
    if (!pinCode.trim()) {
      toast.error('Please enter a PIN code');
      return;
    }
    
    const result = await geocodePinCode(pinCode);
    if (result) {
      onLocationSelect(result.lat, result.lng, result.formattedAddress);
      toast.success(`Location set to: ${result.formattedAddress}`);
    }
  };
  
  return (
    <div className="bg-findvenue-surface/90 backdrop-blur-md rounded-md overflow-hidden shadow-md border border-white/5">
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
      
      <div className="px-3 py-2 border-b border-white/10">
        <LocationSearchInput
          onSearch={onSearch}
          onLocationSelect={onLocationSelect}
          searchText={searchText}
          setSearchText={setSearchText}
        />
      </div>
      
      {isRadiusActive && (
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <Ruler className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
              <span className="text-xs font-medium">Search radius: {radiusInKm.toFixed(1)} km</span>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => setShowPinCodeSearch(!showPinCodeSearch)}
              >
                <MapIcon className="h-3 w-3 mr-1" />
                {showPinCodeSearch ? 'Hide PIN Search' : 'PIN Search'}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={onCurrentLocation}
              >
                <Locate className="h-3 w-3 mr-1" />
                My Location
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={onManualLocation}
              >
                <MapPin className="h-3 w-3 mr-1" />
                Set Location
              </Button>
            </div>
          </div>
          
          {showPinCodeSearch && (
            <div className="mt-2 mb-2 flex gap-1">
              <Input
                type="text"
                placeholder="Enter PIN Code..."
                className="h-7 text-xs"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePinCodeSearch();
                  }
                }}
              />
              <Button 
                size="sm" 
                className="h-7 px-2 bg-findvenue text-white text-xs"
                onClick={handlePinCodeSearch}
                disabled={isGeocodingLoading}
              >
                {isGeocodingLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          )}
          
          <Slider
            value={[radiusInKm]}
            min={0.5}
            max={25}
            step={0.5}
            onValueChange={(values) => onRadiusChange(values[0])}
            className="py-1"
          />
        </div>
      )}
      
      {appliedFilters.length > 0 && (
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-findvenue" />
            <span className="text-xs font-medium mr-2">Applied filters:</span>
            <div className="flex flex-wrap gap-1">
              {appliedFilters.map((filter, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs py-0 px-1 bg-findvenue-surface/50 border-white/20"
                >
                  {filter}
                  <button 
                    className="ml-1"
                    onClick={() => onClearFilter(filter)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMapSearch;
