
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVenues, useCities, useCategories } from '@/hooks/useSupabaseData';
import VenueCard from '@/components/ui/VenueCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  CheckCircle, 
  GridIcon, 
  List, 
  Search, 
  SlidersHorizontal,
  Star, 
  X 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VenuesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const itemsPerPage = 12;
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [cityId, setCityId] = useState<string | undefined>(
    searchParams.get('city') || undefined
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    searchParams.get('category') || undefined
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [capacity, setCapacity] = useState<[number, number]>([0, 1000]);
  const [showFeatured, setShowFeatured] = useState<boolean | undefined>(undefined);
  const [showPopular, setShowPopular] = useState<boolean | undefined>(undefined);
  
  // Fetch data
  const { cities } = useCities();
  const { categories } = useCategories();
  const { venues, loading } = useVenues({
    cityId,
    categoryId,
    featured: showFeatured,
    popular: showPopular,
    priceRange,
    capacity,
    searchTerm: searchTerm.length > 2 ? searchTerm : undefined,
  });
  
  // Update search params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (cityId) params.set('city', cityId);
    if (categoryId) params.set('category', categoryId);
    if (searchTerm.length > 2) params.set('search', searchTerm);
    if (showFeatured) params.set('featured', 'true');
    if (showPopular) params.set('popular', 'true');
    
    setSearchParams(params);
  }, [cityId, categoryId, searchTerm, showFeatured, showPopular, setSearchParams]);
  
  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [cityId, categoryId, priceRange, capacity, showFeatured, showPopular, searchTerm]);
  
  // Handle clear all filters
  const handleClearFilters = () => {
    setCityId(undefined);
    setCategoryId(undefined);
    setPriceRange([0, 50000]);
    setCapacity([0, 1000]);
    setShowFeatured(undefined);
    setShowPopular(undefined);
    setSearchTerm('');
    setCurrentPage(1);
    setSearchParams({});
  };
  
  // Pagination logic
  const paginatedVenues = venues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(venues.length / itemsPerPage);
  
  const renderPagination = () => {
    const pages = [];
    
    // Determine range of page numbers to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={currentPage === i}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationLink>...</PaginationLink>
                </PaginationItem>
              )}
            </>
          )}
          
          {pages}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink>...</PaginationLink>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  // Active filters count
  const activeFiltersCount = [
    cityId, 
    categoryId, 
    searchTerm.length > 2, 
    showFeatured, 
    showPopular, 
    priceRange[0] > 0 || priceRange[1] < 50000,
    capacity[0] > 0 || capacity[1] < 1000
  ].filter(Boolean).length;
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Venues</h1>
          <p className="text-findvenue-text-muted">
            Find the perfect venue for your next event
          </p>
        </div>
        
        {/* Search bar and filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-findvenue-text-muted h-4 w-4" />
            <Input
              placeholder="Search venues..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex gap-2 items-center"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-findvenue text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            
            <Tabs defaultValue="grid" className="hidden md:block">
              <TabsList className="bg-findvenue-surface/50">
                <TabsTrigger value="grid" onClick={() => setViewMode('grid')}>
                  <GridIcon className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Filter chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {cityId && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>City: {cities.find(c => c.id === cityId)?.name}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCityId(undefined)} />
              </Badge>
            )}
            
            {categoryId && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>Category: {categories.find(c => c.id === categoryId)?.name}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryId(undefined)} />
              </Badge>
            )}
            
            {searchTerm.length > 2 && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>Search: {searchTerm}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
              </Badge>
            )}
            
            {showFeatured && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>Featured</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setShowFeatured(undefined)} 
                />
              </Badge>
            )}
            
            {showPopular && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>Popular</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setShowPopular(undefined)} 
                />
              </Badge>
            )}
            
            {(priceRange[0] > 0 || priceRange[1] < 50000) && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>Price: SAR {priceRange[0]} - {priceRange[1]}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setPriceRange([0, 50000])} 
                />
              </Badge>
            )}
            
            {(capacity[0] > 0 || capacity[1] < 1000) && (
              <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                <span>Capacity: {capacity[0]} - {capacity[1]} guests</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setCapacity([0, 1000])} 
                />
              </Badge>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-findvenue-text-muted hover:text-findvenue"
              onClick={handleClearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
        
        {/* Filter panel */}
        {filterOpen && (
          <div className="bg-findvenue-card-bg border border-white/10 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                <Select 
                  value={cityId} 
                  onValueChange={(value) => setCityId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select 
                  value={categoryId} 
                  onValueChange={(value) => setCategoryId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="price" className="border-b-0">
                  <AccordionTrigger className="py-2">
                    <span className="text-sm font-medium">Price Range</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <Slider
                        defaultValue={[0, 50000]}
                        min={0}
                        max={50000}
                        step={1000}
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                      />
                      <div className="flex justify-between mt-2 text-sm">
                        <span>SAR {priceRange[0]}</span>
                        <span>SAR {priceRange[1]}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="capacity" className="border-b-0">
                  <AccordionTrigger className="py-2">
                    <span className="text-sm font-medium">Capacity</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <Slider
                        defaultValue={[0, 1000]}
                        min={0}
                        max={1000}
                        step={10}
                        value={capacity}
                        onValueChange={(value) => setCapacity(value as [number, number])}
                      />
                      <div className="flex justify-between mt-2 text-sm">
                        <span>{capacity[0]} guests</span>
                        <span>{capacity[1]} guests</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${
                  showFeatured ? 'bg-findvenue text-white border-findvenue' : ''
                }`}
                onClick={() => setShowFeatured(prev => prev === true ? undefined : true)}
              >
                <Star className="h-4 w-4" />
                <span>Featured</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${
                  showPopular ? 'bg-findvenue text-white border-findvenue' : ''
                }`}
                onClick={() => setShowPopular(prev => prev === true ? undefined : true)}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Popular</span>
              </Button>
            </div>
          </div>
        )}
        
        {/* Venue Count */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-findvenue-text-muted">
              Showing {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
            </p>
          </div>
        </div>
        
        {/* Venues Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        ) : paginatedVenues.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {paginatedVenues.map((venue) => (
              <div key={venue.id} className="h-full">
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
            <Button
              className="bg-findvenue hover:bg-findvenue-dark"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && renderPagination()}
      </div>
    </div>
  );
};

export default VenuesPage;
