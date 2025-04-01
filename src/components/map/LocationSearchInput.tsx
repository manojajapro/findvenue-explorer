import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, History, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'history' | 'venue';
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface LocationSearchInputProps {
  onSearch: (term: string) => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  isLoading?: boolean;
}

// Enhanced with more realistic locations in Saudi Arabia
const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  { id: '1', text: 'Riyadh City Center', type: 'location', coordinates: { lat: 24.7136, lng: 46.6753 } },
  { id: '2', text: 'Jeddah Corniche', type: 'location', coordinates: { lat: 21.5433, lng: 39.1728 } },
  { id: '3', text: 'Al Khobar Waterfront', type: 'location', coordinates: { lat: 26.2794, lng: 50.2083 } },
  { id: '4', text: 'King Abdullah Financial District', type: 'location', coordinates: { lat: 24.7670, lng: 46.6400 } },
  { id: '5', text: 'Dammam City', type: 'location', coordinates: { lat: 26.4344, lng: 50.1033 } },
  { id: '6', text: 'Makkah Holy Mosque', type: 'location', coordinates: { lat: 21.4225, lng: 39.8262 } },
  { id: '7', text: 'Medina City', type: 'location', coordinates: { lat: 24.5247, lng: 39.5692 } },
  { id: '8', text: 'Tabuk City Center', type: 'location', coordinates: { lat: 28.3835, lng: 36.5662 } },
  { id: '9', text: 'Abha City', type: 'location', coordinates: { lat: 18.2164, lng: 42.5053 } },
  { id: '10', text: 'Al Jubail Industrial City', type: 'location', coordinates: { lat: 27.0174, lng: 49.6622 } },
];

// In a real implementation, this would be replaced with a geocoding service like Google Places API
const getSearchSuggestions = async (query: string): Promise<SearchSuggestion[]> => {
  // This is just a mock implementation
  if (!query.trim()) return [];
  
  // Filter mock suggestions based on query
  return MOCK_SUGGESTIONS.filter(sugg => 
    sugg.text.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);
};

const LocationSearchInput = ({ 
  onSearch, 
  onLocationSelect, 
  searchText, 
  setSearchText,
  isLoading = false
}: LocationSearchInputProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([]);
  const debouncedSearchTerm = useDebounce(searchText, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mapRecentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      console.error("Error loading recent searches", e);
    }
  }, []);

  // Save a search to recent searches
  const saveToRecentSearches = (suggestion: SearchSuggestion) => {
    const updated = [suggestion, ...recentSearches.filter(s => s.id !== suggestion.id)].slice(0, 5);
    setRecentSearches(updated);
    
    try {
      localStorage.setItem('mapRecentSearches', JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving recent searches", e);
    }
  };

  // Fetch suggestions when search term changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchTerm.trim()) {
        const results = await getSearchSuggestions(debouncedSearchTerm);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    };
    
    fetchSuggestions();
  }, [debouncedSearchTerm]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setSearchText(suggestion.text);
    setShowSuggestions(false);
    onSearch(suggestion.text);
    
    if (suggestion.coordinates) {
      onLocationSelect(
        suggestion.coordinates.lat, 
        suggestion.coordinates.lng, 
        suggestion.text
      );
    }
    
    saveToRecentSearches(suggestion);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchText);
    setShowSuggestions(false);
    
    // Save current search to history if not empty
    if (searchText.trim()) {
      const newSuggestion: SearchSuggestion = {
        id: Date.now().toString(),
        text: searchText,
        type: 'history'
      };
      saveToRecentSearches(newSuggestion);
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search locations or venues..."
          className="pl-10 pr-8 py-2 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          disabled={isLoading}
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
      
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-findvenue-surface/95 backdrop-blur-md border border-white/10 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto"
        >
          {suggestions.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-medium text-findvenue-text-muted">Suggested Locations</p>
              </div>
              <div>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center transition-colors"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <MapPin className="h-4 w-4 mr-2 text-findvenue" />
                    <span className="truncate">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          
          {suggestions.length === 0 && recentSearches.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-medium text-findvenue-text-muted">Recent Searches</p>
              </div>
              <div>
                {recentSearches.map((search) => (
                  <button
                    key={search.id}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center transition-colors"
                    onClick={() => handleSelectSuggestion(search)}
                  >
                    <History className="h-4 w-4 mr-2 text-findvenue-text-muted" />
                    <span className="truncate">{search.text}</span>
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-white/10 hover:bg-white/5">
                <button 
                  className="w-full text-left flex items-center text-xs text-findvenue"
                  onClick={() => {
                    localStorage.removeItem('mapRecentSearches');
                    setRecentSearches([]);
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear recent searches
                </button>
              </div>
            </>
          )}
          
          {suggestions.length === 0 && recentSearches.length === 0 && searchText.trim() !== '' && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-findvenue-text-muted">No suggestions found</p>
              <p className="text-xs text-findvenue-text-muted mt-1">Try a different search term or click on the map to set location</p>
            </div>
          )}
          
          {suggestions.length === 0 && recentSearches.length === 0 && searchText.trim() === '' && (
            <div className="px-3 py-4">
              <div className="text-center mb-3">
                <Globe className="h-8 w-8 mx-auto mb-2 text-findvenue-text-muted opacity-50" />
                <p className="text-sm">Start typing to search</p>
                <p className="text-xs text-findvenue-text-muted mt-1">Search for a location or click on the map</p>
              </div>
              <div className="grid grid-cols-2 gap-2 px-2">
                {MOCK_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="text-xs px-2 py-1.5 bg-findvenue-surface/50 hover:bg-findvenue-surface border border-white/10 rounded text-left truncate"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearchInput;
