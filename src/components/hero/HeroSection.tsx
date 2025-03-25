
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Calendar, MapPin, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const eventTypes = [
  'Wedding',
  'Corporate Event',
  'Birthday Party',
  'Conference',
  'Exhibition',
  'Workshop',
  'Gala',
  'Product Launch',
  'Seminar',
  'Retreat'
];

const cities = [
  'Riyadh',
  'Jeddah',
  'Dammam',
  'Mecca',
  'Medina',
  'Khobar',
  'Abha',
  'Tabuk'
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (eventType) params.append('eventType', eventType);
    if (guests) params.append('guests', guests);
    if (location) params.append('location', location);
    
    navigate(`/?${params.toString()}`);
  };
  
  const clearForm = () => {
    setEventType('');
    setGuests('');
    setLocation('');
  };
  
  return (
    <section className="relative min-h-screen flex items-center justify-center py-20 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-findvenue-dark-bg/70 via-findvenue-dark-bg/90 to-findvenue-dark-bg z-10" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://player.vimeo.com/external/370331493.hd.mp4?s=ce49c8c6d8e28a89298ffb4c53a2e842df6d344d&profile_id=175&oauth2_token_id=57447761" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto stagger-animation">
          <h5 className="text-findvenue font-medium mb-4 inline-block bg-findvenue/10 px-4 py-1 rounded-full">
            Find and Book Amazing Venues
          </h5>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
            Find and book venues for any event imaginable
          </h1>
          <p className="text-xl text-findvenue-text mb-10 max-w-3xl mx-auto">
            Discover the perfect space for your next event in Saudi Arabia with our curated selection of premium venues
          </p>
        </div>
        
        {/* Search Form */}
        <form 
          onSubmit={handleSearch}
          className="bg-findvenue-card-bg/80 backdrop-blur-xl p-4 md:p-6 rounded-lg border border-white/10 max-w-5xl mx-auto shadow-xl"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Event Type */}
            <div className="flex-1 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between border-white/10 bg-findvenue-surface/50 hover:bg-findvenue-surface h-12 ${eventType ? 'text-white' : 'text-findvenue-text-muted'}`}
                  >
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      {eventType || 'Event Type'}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-[300px] overflow-y-auto bg-findvenue-card-bg border-white/10">
                  <div className="grid gap-1 p-2">
                    {eventTypes.map((type) => (
                      <Button
                        key={type}
                        variant="ghost"
                        className="justify-start text-findvenue-text hover:text-white hover:bg-findvenue-surface"
                        onClick={() => {
                          setEventType(type);
                          document.body.click(); // Close popover
                        }}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Number of Guests */}
            <div className="flex-1 min-w-0">
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
            
            {/* Location */}
            <div className="flex-1 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between border-white/10 bg-findvenue-surface/50 hover:bg-findvenue-surface h-12 ${location ? 'text-white' : 'text-findvenue-text-muted'}`}
                  >
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      {location || 'Location'}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-[300px] overflow-y-auto bg-findvenue-card-bg border-white/10">
                  <div className="grid gap-1 p-2">
                    {cities.map((city) => (
                      <Button
                        key={city}
                        variant="ghost"
                        className="justify-start text-findvenue-text hover:text-white hover:bg-findvenue-surface"
                        onClick={() => {
                          setLocation(city);
                          document.body.click(); // Close popover
                        }}
                      >
                        {city}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Search Button */}
            <Button
              type="submit"
              className="bg-findvenue hover:bg-findvenue-dark h-12 transition-all duration-300 px-8"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          
          {/* Advanced Filters Toggle */}
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
            
            {(eventType || guests || location) && (
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
          
          {/* Advanced Filters (hidden by default) */}
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
