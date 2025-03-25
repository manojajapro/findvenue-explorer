
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VenueCard } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GridIcon, List, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseVenues } from '@/hooks/useSupabaseVenues';

interface FilterPanelProps {
  cities: any[];
  categories: any[];
  onApplyFilters: () => void;
}

const FilterPanel = ({ cities, categories, onApplyFilters }: FilterPanelProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [guests, setGuests] = useState<number>(searchParams.get('guests') ? parseInt(searchParams.get('guests')!) : 100);
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('cityId') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('categoryId') || '');
  const [priceRange, setPriceRange] = useState<string>(searchParams.get('priceRange') || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    searchParams.get('amenities') ? searchParams.get('amenities')!.split(',') : []
  );
  
  const amenitiesList = [
    'WiFi', 'Parking', 'Catering', 'Sound System', 
    'Lighting', 'Stage', 'Bridal Suite', 'Outdoor Area'
  ];
  
  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (checked) {
      setSelectedAmenities([...selectedAmenities, amenity]);
    } else {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    }
  };
  
  const applyFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    
    // Clear existing filters
    newParams.delete('cityId');
    newParams.delete('categoryId');
    newParams.delete('guests');
    newParams.delete('priceRange');
    newParams.delete('amenities');
    
    // Add new filter values
    if (selectedCity) newParams.set('cityId', selectedCity);
    if (selectedCategory) newParams.set('categoryId', selectedCategory);
    if (guests) newParams.set('guests', guests.toString());
    if (priceRange) newParams.set('priceRange', priceRange);
    if (selectedAmenities.length > 0) newParams.set('amenities', selectedAmenities.join(','));
    
    setSearchParams(newParams);
    onApplyFilters();
  };
  
  const clearFilters = () => {
    setSelectedCity('');
    setSelectedCategory('');
    setGuests(100);
    setPriceRange('');
    setSelectedAmenities([]);
    
    setSearchParams(new URLSearchParams());
    onApplyFilters();
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Filters</h3>
        
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block">City</Label>
            <select
              className="w-full p-2 bg-findvenue-surface/50 border border-white/10 rounded-md"
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <Label className="mb-2 block">Category</Label>
            <select
              className="w-full p-2 bg-findvenue-surface/50 border border-white/10 rounded-md"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <Label className="mb-2 block">Number of Guests: {guests}</Label>
            <Slider
              value={[guests]}
              min={10}
              max={1000}
              step={10}
              onValueChange={value => setGuests(value[0])}
              className="py-4"
            />
          </div>
          
          <div>
            <Label className="mb-2 block">Price Range</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={priceRange === 'budget' ? 'default' : 'outline'}
                className={priceRange === 'budget' ? 'bg-findvenue' : 'border-white/10'}
                onClick={() => setPriceRange('budget')}
              >
                Budget
              </Button>
              <Button
                variant={priceRange === 'mid' ? 'default' : 'outline'}
                className={priceRange === 'mid' ? 'bg-findvenue' : 'border-white/10'}
                onClick={() => setPriceRange('mid')}
              >
                Mid-range
              </Button>
              <Button
                variant={priceRange === 'luxury' ? 'default' : 'outline'}
                className={priceRange === 'luxury' ? 'bg-findvenue' : 'border-white/10'}
                onClick={() => setPriceRange('luxury')}
              >
                Luxury
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {amenitiesList.map(amenity => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`amenity-${amenity}`}
                    checked={selectedAmenities.includes(amenity)}
                    onCheckedChange={(checked) => handleAmenityChange(amenity, checked as boolean)}
                  />
                  <label
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <Button onClick={applyFilters} className="flex-1 bg-findvenue hover:bg-findvenue-dark">
          Apply Filters
        </Button>
        <Button onClick={clearFilters} variant="outline" className="flex-1 border-white/10">
          Clear
        </Button>
      </div>
    </div>
  );
};

const VenuesList = () => {
  const { venues, categories, cities, isLoading, fetchVenues, totalCount } = useSupabaseVenues();
  const [listView, setListView] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-findvenue-text-muted">
            {isLoading ? 'Loading venues...' : `Showing ${venues.length} of ${totalCount} venues`}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-white/10">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-findvenue-card-bg border-l border-white/10">
              <FilterPanel 
                cities={cities}
                categories={categories}
                onApplyFilters={fetchVenues}
              />
            </SheetContent>
          </Sheet>
          
          <Tabs 
            defaultValue="grid" 
            className="w-auto"
            value={listView}
            onValueChange={(value) => setListView(value as 'grid' | 'list')}
          >
            <TabsList className="bg-findvenue-surface/50">
              <TabsTrigger value="grid">
                <GridIcon className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <VenueCardSkeleton key={i} />
          ))}
        </div>
      ) : venues.length > 0 ? (
        <div className={
          listView === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" 
            : "space-y-4"
        }>
          {venues.map((venue) => (
            <div key={venue.id} className="h-full cursor-pointer" onClick={() => handleVenueClick(venue.id)}>
              <VenueCard venue={venue} featured={venue.featured} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-xl font-medium mb-2">No venues found</h3>
          <p className="text-findvenue-text-muted mb-6">
            Try adjusting your search filters to find more options
          </p>
        </div>
      )}
    </div>
  );
};

const VenueCardSkeleton = () => (
  <div className="bg-findvenue-card-bg border border-white/10 rounded-lg overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
      </div>
    </div>
  </div>
);

export default VenuesList;
