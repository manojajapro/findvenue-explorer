
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

const NavbarSearchButton = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch categories and cities from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: categoryData } = await supabase
          .from('category_groups')
          .select('category_id, category_name')
          .order('category_name');
          
        if (categoryData) {
          setCategories(categoryData);
        }
        
        // Fetch cities
        const { data: cityData } = await supabase
          .from('city_groups')
          .select('city_id, city_name')
          .order('city_name');
          
        if (cityData) {
          setCities(cityData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/venues?search=${encodeURIComponent(searchTerm.trim())}&view=map`);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Handle category or city selection
  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    navigate(`/venues?categoryId=${categoryId}&view=map`);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCitySelect = (cityId: string, cityName: string) => {
    navigate(`/venues?cityId=${cityId}&view=map`);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Filter categories and cities based on search term
  const filteredCategories = categories.filter(cat => 
    cat.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 3);

  const filteredCities = cities.filter(city => 
    city.city_name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 3);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Search venues">
          <Search className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <form onSubmit={handleSearch} className="flex items-center p-2 border-b border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
            <Input
              type="text"
              placeholder="Search venues..."
              className="pl-9 bg-findvenue-surface/50 border-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
              </button>
            )}
          </div>
          <Button type="submit" className="ml-2 bg-findvenue hover:bg-findvenue-dark">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
        {searchTerm && (filteredCategories.length > 0 || filteredCities.length > 0) ? (
          <div className="p-2">
            {filteredCategories.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-findvenue-text-muted px-2 py-1">Event Types</p>
                {filteredCategories.map(cat => (
                  <Button 
                    key={cat.category_id}
                    variant="ghost" 
                    className="w-full justify-start text-sm"
                    onClick={() => handleCategorySelect(cat.category_id, cat.category_name)}
                  >
                    <Search className="h-3.5 w-3.5 mr-2 text-findvenue-text-muted" />
                    {cat.category_name}
                  </Button>
                ))}
              </div>
            )}
            
            {filteredCities.length > 0 && (
              <div>
                <p className="text-xs text-findvenue-text-muted px-2 py-1">Cities</p>
                {filteredCities.map(city => (
                  <Button 
                    key={city.city_id}
                    variant="ghost" 
                    className="w-full justify-start text-sm"
                    onClick={() => handleCitySelect(city.city_id, city.city_name)}
                  >
                    <MapIcon className="h-3.5 w-3.5 mr-2 text-findvenue-text-muted" />
                    {city.city_name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 text-sm">
            <p className="text-findvenue-text-muted">Search by name, features or location</p>
            <Button 
              variant="ghost" 
              className="mt-2 text-findvenue w-full justify-start px-2"
              onClick={() => {
                navigate('/venues?view=map');
                setIsOpen(false);
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              View all venues on map
            </Button>
            <Button 
              variant="ghost" 
              className="mt-1 text-findvenue w-full justify-start px-2"
              onClick={() => {
                navigate('/venues?view=map&mapTools=radius');
                setIsOpen(false);
              }}
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Search venues by radius
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NavbarSearchButton;
