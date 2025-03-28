import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VenueCard } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GridIcon, List, SlidersHorizontal, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseVenues } from '@/hooks/useSupabaseVenues';
import { Card, CardContent } from '@/components/ui/card';

interface FilterPanelProps {
  cities: any[];
  categories: any[];
  onApplyFilters: () => void;
}

interface VenuesListProps {
  compact?: boolean;
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
    
    newParams.delete('cityId');
    newParams.delete('categoryId');
    newParams.delete('guests');
    newParams.delete('priceRange');
    newParams.delete('amenities');
    
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

const CompactVenueCard = ({ venue, onClick }: { venue: any, onClick: () => void }) => {
  return (
    <Card 
      className="cursor-pointer hover:bg-findvenue-surface/10 transition-colors border-white/10 mb-3"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="w-20 h-20 flex-shrink-0">
            <img 
              src={venue.imageUrl} 
              alt={venue.name} 
              className="w-full h-full object-cover rounded-md"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-1">{venue.name}</h3>
            <div className="flex items-center text-xs text-findvenue-text-muted mb-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate">{venue.address}, {venue.city}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-sm font-medium text-findvenue">
                {venue.pricing.startingPrice} {venue.pricing.currency}
              </div>
              <div className="text-xs text-findvenue-text-muted">
                Up to {venue.capacity.max} guests
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const VenuesList = ({ compact = false }: VenuesListProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const navigate = useNavigate();
  
  const { venues: allVenues, categories, cities, isLoading, fetchVenues, totalCount } = useSupabaseVenues();
  const [listView, setListView] = useState<'grid' | 'list'>(compact ? 'list' : 'grid');
  
  const venues = searchTerm 
    ? allVenues.filter(venue => 
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.amenities.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allVenues;
  
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
  };
  
  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm) newParams.delete('search');
    setSearchParams(newParams);
  };
  
  return (
    <div>
      {!compact && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-findvenue-text-muted">
              {isLoading 
                ? 'Loading venues...' 
                : searchTerm 
                  ? `Found ${venues.length} venues matching "${searchTerm}"` 
                  : `Showing ${venues.length} of ${totalCount} venues`
              }
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
            
            {!compact && (
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
            )}
          </div>
        </div>
      )}
      
      {compact && (
        <div className="mb-4">
          <p className="text-sm text-findvenue-text-muted mb-3">
            {isLoading 
              ? 'Loading venues...' 
              : `${venues.length} venues found`
            }
          </p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full border-white/10">
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
        </div>
      )}
      
      {isLoading ? (
        <div className={compact ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"}>
          {[...Array(compact ? 5 : 8)].map((_, i) => (
            <VenueCardSkeleton key={i} compact={compact} />
          ))}
        </div>
      ) : venues.length > 0 ? (
        compact ? (
          <div className="space-y-0 max-h-[530px] overflow-y-auto pr-2 custom-scrollbar">
            {venues.map((venue) => (
              <CompactVenueCard 
                key={venue.id} 
                venue={venue} 
                onClick={() => handleVenueClick(venue.id)} 
              />
            ))}
          </div>
        ) : (
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
        )
      ) : (
        <div className={`text-center ${compact ? "py-8" : "py-16"}`}>
          <h3 className="text-xl font-medium mb-2">No venues found</h3>
          <p className="text-findvenue-text-muted mb-6">
            Try adjusting your search filters to find more options
          </p>
          <Button
            className="bg-findvenue hover:bg-findvenue-dark"
            onClick={handleClearSearch}
          >
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
};

const VenueCardSkeleton = ({ compact = false }: { compact?: boolean }) => {
  if (compact) {
    return (
      <div className="border border-white/10 rounded-lg p-3 mb-3">
        <div className="flex gap-3">
          <Skeleton className="h-20 w-20 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
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
};

export default VenuesList;
