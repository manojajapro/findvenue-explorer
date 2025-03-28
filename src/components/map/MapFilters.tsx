
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
  Filter, 
  X, 
  ChevronDown, 
  Check 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';

interface Category {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
}

interface MapFiltersProps {
  categories: Category[];
  cities: City[];
  onFilterChange?: () => void;
}

const MapFilters: React.FC<MapFiltersProps> = ({ 
  categories, 
  cities,
  onFilterChange
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('categoryId')
  );
  const [selectedCity, setSelectedCity] = useState<string | null>(
    searchParams.get('cityId')
  );
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  
  const categoryName = categories.find(c => c.id === selectedCategory)?.name || '';
  const cityName = cities.find(c => c.id === selectedCity)?.name || '';
  
  const hasFilters = selectedCategory || selectedCity;
  
  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    if (selectedCategory) {
      newParams.set('categoryId', selectedCategory);
    } else {
      newParams.delete('categoryId');
    }
    
    if (selectedCity) {
      newParams.set('cityId', selectedCity);
    } else {
      newParams.delete('cityId');
    }
    
    setSearchParams(newParams, { replace: true });
    
    if (onFilterChange) {
      onFilterChange();
    }
  }, [selectedCategory, selectedCity, searchParams, setSearchParams, onFilterChange]);
  
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    setIsCategoryOpen(false);
  };
  
  const handleCitySelect = (cityId: string) => {
    setSelectedCity(cityId === selectedCity ? null : cityId);
    setIsCityOpen(false);
  };
  
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
  };
  
  return (
    <div className="bg-findvenue-surface/90 backdrop-blur-md rounded-md p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Map Filters</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearFilters}
          >
            Clear All <X className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        {/* Category filter */}
        <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between border-white/10 bg-findvenue-surface/50"
            >
              {selectedCategory ? categoryName : "Select Category"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-findvenue-surface border-white/10">
            <Command>
              <CommandInput placeholder="Search categories..." />
              <CommandList>
                <CommandEmpty>No categories found</CommandEmpty>
                <CommandGroup>
                  {categories.map(category => (
                    <CommandItem 
                      key={category.id} 
                      value={category.name}
                      onSelect={() => handleCategorySelect(category.id)}
                      className="flex items-center gap-2"
                    >
                      {selectedCategory === category.id && (
                        <Check className="h-4 w-4 text-findvenue" />
                      )}
                      <span className={selectedCategory === category.id ? "text-findvenue" : ""}>
                        {category.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* City filter */}
        <Popover open={isCityOpen} onOpenChange={setIsCityOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between border-white/10 bg-findvenue-surface/50"
            >
              {selectedCity ? cityName : "Select City"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-findvenue-surface border-white/10">
            <Command>
              <CommandInput placeholder="Search cities..." />
              <CommandList>
                <CommandEmpty>No cities found</CommandEmpty>
                <CommandGroup>
                  {cities.map(city => (
                    <CommandItem 
                      key={city.id} 
                      value={city.name}
                      onSelect={() => handleCitySelect(city.id)}
                      className="flex items-center gap-2"
                    >
                      {selectedCity === city.id && (
                        <Check className="h-4 w-4 text-findvenue" />
                      )}
                      <span className={selectedCity === city.id ? "text-findvenue" : ""}>
                        {city.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      {hasFilters && (
        <>
          <Separator className="my-2 bg-white/10" />
          <div className="flex flex-wrap gap-2">
            {selectedCategory && (
              <Badge variant="outline" className="bg-findvenue-surface/50 border-white/20 text-xs">
                {categoryName}
                <button 
                  className="ml-1"
                  onClick={() => setSelectedCategory(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedCity && (
              <Badge variant="outline" className="bg-findvenue-surface/50 border-white/20 text-xs">
                {cityName}
                <button 
                  className="ml-1"
                  onClick={() => setSelectedCity(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MapFilters;
