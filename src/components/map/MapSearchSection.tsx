
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRealTimeVenues } from '@/hooks/useRealTimeVenues';
import { Search, MapPin, Users, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MapView from './MapView';
import { Badge } from '@/components/ui/badge';

const MapSearchSection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { venues, categories, cities } = useRealTimeVenues();
  
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [venueType, setVenueType] = useState('');
  const [guests, setGuests] = useState('');
  
  // Extract unique venue types from venues data
  const venueTypes = React.useMemo(() => {
    const typesSet = new Set<string>();
    
    venues.forEach(venue => {
      if (venue.type) {
        typesSet.add(venue.type);
      }
    });
    
    return Array.from(typesSet).sort();
  }, [venues]);
  
  useEffect(() => {
    // Initialize filters from URL search params
    setSearch(searchParams.get('search') || '');
    setCityId(searchParams.get('cityId') || '');
    setCategoryId(searchParams.get('categoryId') || '');
    setVenueType(searchParams.get('type') || '');
    setGuests(searchParams.get('guests') || '');
  }, [searchParams]);
  
  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    if (cityId) params.append('cityId', cityId);
    if (categoryId) params.append('categoryId', categoryId);
    if (venueType) params.append('type', venueType);
    if (guests) params.append('guests', guests);
    
    navigate(`/venues?${params.toString()}&view=map`);
  };
  
  const clearFilters = () => {
    setSearch('');
    setCityId('');
    setCategoryId('');
    setVenueType('');
    setGuests('');
  };
  
  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold mb-2">Find Venues on Map</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore and discover venues in your desired location with our interactive map search.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search venues..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Location" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={venueType} onValueChange={setVenueType}>
              <SelectTrigger>
                <SelectValue placeholder="Venue Type" />
              </SelectTrigger>
              <SelectContent>
                {venueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Guests" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Up to 10 guests</SelectItem>
                <SelectItem value="25">Up to 25 guests</SelectItem>
                <SelectItem value="50">Up to 50 guests</SelectItem>
                <SelectItem value="100">Up to 100 guests</SelectItem>
                <SelectItem value="250">Up to 250 guests</SelectItem>
                <SelectItem value="500">Up to 500 guests</SelectItem>
                <SelectItem value="1000">Up to 1000 guests</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="md:col-span-3"></div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                Reset
              </Button>
              <Button variant="default" className="flex-1" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
          
          {(search || cityId || categoryId || venueType || guests) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {search && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Search: {search}
                </Badge>
              )}
              {cityId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Location: {cities.find(c => c.id === cityId)?.name || cityId}
                </Badge>
              )}
              {categoryId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Event Type: {categories.find(c => c.id === categoryId)?.name || categoryId}
                </Badge>
              )}
              {venueType && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Venue Type: {venueType}
                </Badge>
              )}
              {guests && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Up to {guests} guests
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="rounded-lg overflow-hidden h-[500px] shadow-lg">
          <MapView />
        </div>
      </div>
    </section>
  );
};

export default MapSearchSection;
