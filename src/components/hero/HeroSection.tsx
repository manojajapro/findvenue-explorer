import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Users, Calendar, MapPin, ChevronDown, X, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useGeocode } from '@/hooks/useGeocode';
import MapSearchSection from '@/components/map/MapSearchSection';

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [eventType, setEventType] = useState('');
  const [venueType, setVenueType] = useState('');
  const [guests, setGuests] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [venueTypes, setVenueTypes] = useState<{value: string, label: string}[]>([]);
  const { geocodePinCode, isLoading } = useGeocode();
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: categoryGroupsData, error: categoryGroupsError } = await supabase
          .from('category_groups')
          .select('category_id, category_name')
          .order('category_name');
        
        if (categoryGroupsError || !categoryGroupsData || categoryGroupsData.length === 0) {
          const { data: venuesData, error: venuesError } = await supabase
            .from('venues')
            .select('category_id, category_name')
            .order('category_name');
            
          if (venuesError) throw venuesError;
          
          if (venuesData) {
            const uniqueCategories = new Map();
            
            venuesData.forEach(venue => {
              if (Array.isArray(venue.category_id)) {
                venue.category_id.forEach((catId, index) => {
                  if (!catId) return;
                  
                  let categoryName = '';
                  if (Array.isArray(venue.category_name) && venue.category_name[index]) {
                    categoryName = venue.category_name[index];
                  } else if (typeof venue.category_name === 'string' && venue.category_name.startsWith('[')) {
                    try {
                      const parsedCategories = JSON.parse(venue.category_name.replace(/'/g, '"'));
                      categoryName = parsedCategories[index] || 'Unnamed Category';
                    } catch (e) {
                      const match = venue.category_name.match(/'([^']+)'/);
                      categoryName = match ? match[1] : 'Unnamed Category';
                    }
                  }
                  
                  if (categoryName && catId && !uniqueCategories.has(catId)) {
                    uniqueCategories.set(catId, {
                      id: catId,
                      name: categoryName
                    });
                  }
                });
              } else if (venue.category_id) {
                let categoryName = venue.category_name || 'Unnamed Category';
                
                if (typeof categoryName === 'string' && categoryName.startsWith('[')) {
                  try {
                    const parsedCategories = JSON.parse(categoryName.replace(/'/g, '"'));
                    categoryName = parsedCategories[0] || 'Unnamed Category';
                  } catch (e) {
                    const match = categoryName.match(/'([^']+)'/);
                    categoryName = match ? match[1] : 'Unnamed Category';
                  }
                }
                
                if (!uniqueCategories.has(venue.category_id)) {
                  uniqueCategories.set(venue.category_id, {
                    id: venue.category_id,
                    name: categoryName
                  });
                }
              }
            });
            
            const formattedCategories = Array.from(uniqueCategories.values());
            setCategories(formattedCategories);
          }
        } else {
          const formattedCategories = categoryGroupsData.map(cat => {
            let categoryName = cat.category_name || '';
            
            if (typeof categoryName === 'string' && categoryName.startsWith('[')) {
              try {
                const parsedCategories = JSON.parse(categoryName.replace(/'/g, '"'));
                categoryName = parsedCategories[0] || 'Unnamed Category';
              } catch (e) {
                const match = categoryName.match(/'([^']+)'/);
                categoryName = match ? match[1] : 'Unnamed Category';
              }
            }
            
            return {
              id: cat.category_id || '',
              name: categoryName
            };
          }).filter(cat => cat.id && cat.name);
          
          setCategories(formattedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  useEffect(() => {
    const fetchVenueTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('type')
          .not('type', 'is', null);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const uniqueTypes = new Map();
          
          data.forEach(venue => {
            if (venue.type && typeof venue.type === 'string') {
              const formattedType = venue.type.charAt(0).toUpperCase() + venue.type.slice(1);
              uniqueTypes.set(venue.type, {
                value: venue.type,
                label: formattedType
              });
            }
          });
          
          const typeArray = Array.from(uniqueTypes.values());
          
          if (typeArray.length > 0) {
            setVenueTypes(typeArray);
          } else {
            setVenueTypes([
              { value: 'hall', label: 'Hall' },
              { value: 'restaurant', label: 'Restaurant' },
              { value: 'hotel', label: 'Hotel' },
              { value: 'outdoor', label: 'Outdoor' },
              { value: 'lounge', label: 'Lounge' },
              { value: 'rooftop', label: 'Rooftop' }
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching venue types:', error);
        setVenueTypes([
          { value: 'hall', label: 'Hall' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'hotel', label: 'Hotel' },
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'lounge', label: 'Lounge' },
          { value: 'rooftop', label: 'Rooftop' }
        ]);
      }
    };
    
    fetchVenueTypes();
  }, []);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (eventType) params.append('categoryId', eventType);
    if (venueType) params.append('type', venueType);
    if (guests) params.append('guests', guests);
    
    if (location) params.append('search', location);
    
    if (date) params.append('date', format(date, 'yyyy-MM-dd'));
    
    params.append('showMap', 'true');
    navigate(`/?${params.toString()}`);
  };
  
  const handleMapSearch = async (location: string) => {
    const params = new URLSearchParams();
    if (location) {
      params.append('search', location);
    }
    params.append('showMap', 'true');
    navigate(`/?${params.toString()}`);
  };
  
  const clearForm = () => {
    setEventType('');
    setVenueType('');
    setGuests('');
    setLocation('');
    setDate(undefined);
  };
  
  const matchesSearchTerm = (name: string, term: string): boolean => {
    return name.toLowerCase().includes(term.toLowerCase());
  };
  
  return (
    <section className="relative min-h-screen flex items-center justify-center py-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-findvenue-dark-bg/70 via-findvenue-dark-bg/90 to-findvenue-dark-bg z-10" />
        <img 
          src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2798&auto=format&fit=crop"
          alt="Luxury venue background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto stagger-animation">
          <h5 className="text-findvenue font-medium mb-4 inline-block bg-findvenue/10 px-4 py-1 rounded-full">
            Find and Book Amazing Venues
          </h5>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
            Find and book venues for any event imaginable
          </h1>
          <p className="text-xl text-findvenue-text mb-6 max-w-3xl mx-auto">
            Discover the perfect space for your next event in Saudi Arabia with our curated selection of premium venues
          </p>
          
          <div className="mb-10">
            <MapSearchSection onLocationSelected={handleMapSearch} />
          </div>
        </div>
        
        <form 
          onSubmit={handleSearch}
          className="bg-findvenue-card-bg/80 backdrop-blur-xl p-4 md:p-6 rounded-lg border border-white/10 max-w-5xl mx-auto shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between border-white/10 bg-findvenue-surface/50 hover:bg-findvenue-surface h-12 ${eventType ? 'text-white' : 'text-findvenue-text-muted'}`}
                  >
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      {categories.find(cat => cat.id === eventType)?.name || 'Event Type'}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-[300px] overflow-y-auto bg-findvenue-card-bg border-white/10">
                  <div className="grid gap-1 p-2">
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant="ghost"
                        className="justify-start text-findvenue-text hover:text-white hover:bg-findvenue-surface"
                        onClick={() => {
                          setEventType(category.id);
                          document.body.click();
                        }}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="lg:col-span-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between border-white/10 bg-findvenue-surface/50 hover:bg-findvenue-surface h-12 ${venueType ? 'text-white' : 'text-findvenue-text-muted'}`}
                  >
                    <div className="flex items-center">
                      <Building className="mr-2 h-4 w-4" />
                      {venueTypes.find(type => type.value === venueType)?.label || 'Venue Type'}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-[300px] overflow-y-auto bg-findvenue-card-bg border-white/10">
                  <div className="grid gap-1 p-2">
                    {venueTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant="ghost"
                        className="justify-start text-findvenue-text hover:text-white hover:bg-findvenue-surface"
                        onClick={() => {
                          setVenueType(type.value);
                          document.body.click();
                        }}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="lg:col-span-1">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Number of guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="bg-findvenue-surface/50 border-white/10 pl-10 h-12"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-findvenue-surface/50 border-white/10 pl-10 h-12"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
                {location && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setLocation('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <Button
                type="submit"
                className="bg-findvenue hover:bg-findvenue-dark h-12 transition-all duration-300 px-8 w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              className="text-findvenue-text-muted hover:text-white text-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide advanced filters' : 'Show advanced filters'}
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            {(eventType || venueType || guests || location || date) && (
              <Button
                type="button"
                variant="ghost"
                className="text-findvenue-text-muted hover:text-white text-sm"
                onClick={clearForm}
              >
                Clear all
                <X className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
          
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 animate-fade-in">
              <div>
                <p className="text-sm text-findvenue-text-muted mb-2">Price Range</p>
                <Select>
                  <SelectTrigger className="bg-findvenue-surface/50 border-white/10">
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent className="bg-findvenue-card-bg border-white/10">
                    <SelectItem value="budget">Budget (Under SAR 10,000)</SelectItem>
                    <SelectItem value="mid">Mid-range (SAR 10,000 - 30,000)</SelectItem>
                    <SelectItem value="luxury">Luxury (SAR 30,000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <p className="text-sm text-findvenue-text-muted mb-2">Amenities</p>
                <Select>
                  <SelectTrigger className="bg-findvenue-surface/50 border-white/10">
                    <SelectValue placeholder="Select amenities" />
                  </SelectTrigger>
                  <SelectContent className="bg-findvenue-card-bg border-white/10">
                    <SelectItem value="catering">Catering</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="av">AV Equipment</SelectItem>
                    <SelectItem value="wifi">WiFi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <p className="text-sm text-findvenue-text-muted mb-2">Venue Style</p>
                <Select>
                  <SelectTrigger className="bg-findvenue-surface/50 border-white/10">
                    <SelectValue placeholder="Any style" />
                  </SelectTrigger>
                  <SelectContent className="bg-findvenue-card-bg border-white/10">
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="rooftop">Rooftop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
};

export default HeroSection;
