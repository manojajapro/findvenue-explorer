
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface HeroSectionProps {
  scrollToMapSection?: () => void;
}

const HeroSection = ({ scrollToMapSection }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [eventType, setEventType] = useState(searchParams.get('eventType') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '');
  const [date, setDate] = useState<Date | undefined>(
    searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined
  );

  const handleSearch = (showMap: boolean = false) => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (eventType) params.set('eventType', eventType);
    if (guests) params.set('guests', guests);
    if (date) params.set('date', format(date, 'yyyy-MM-dd'));
    
    if (showMap) {
      params.set('showMap', 'true');
      navigate(`/?${params.toString()}`);
    } else {
      navigate(`/venues?${params.toString()}`);
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-findvenue-dark to-findvenue-dark/90 px-4 py-16">
      <div 
        className="absolute inset-0 z-0 opacity-30 bg-cover bg-center" 
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1578269174936-2709b6aeb913?ixlib=rb-1.2.1&auto=format&fit=crop&w=1351&q=80')" 
        }}
      />
      
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-findvenue-dark" />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
            Find the Perfect Venue for Your Event
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Discover and book unique venues for any occasion across Saudi Arabia
          </p>
          
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="location" className="text-white mb-2 block">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
                  <Input
                    id="location"
                    placeholder="City, area or venue"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="eventType" className="text-white mb-2 block">Event Type</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
                  <Input
                    id="eventType"
                    placeholder="Wedding, conference..."
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="date" className="text-white mb-2 block">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white"
                    >
                      <Calendar className="mr-2 h-4 w-4 opacity-50" />
                      {date ? format(date, 'PPP') : <span className="text-white/50">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="guests" className="text-white mb-2 block">Guests</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
                  <Input
                    id="guests"
                    type="number"
                    placeholder="Number of guests"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                onClick={() => handleSearch()}
                className="bg-findvenue hover:bg-findvenue/90 text-white px-8 py-6 text-lg"
              >
                <Search className="mr-2 h-5 w-5" /> Find Venues
              </Button>
              
              <Button
                onClick={() => {
                  if (scrollToMapSection) {
                    scrollToMapSection();
                  } else {
                    handleSearch(true);
                  }
                }}
                variant="outline"
                className="border-findvenue text-white hover:bg-findvenue/20 px-8 py-6 text-lg"
              >
                <MapPin className="mr-2 h-5 w-5" /> Explore on Map
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          <Badge className="bg-white/10 hover:bg-white/20 text-white">Conference Venues</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white">Wedding Halls</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white">Birthday Venues</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white">Corporate Events</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white">Graduation Parties</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white">Workshop Spaces</Badge>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-transparent animate-bounce"
          onClick={scrollToMapSection}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default HeroSection;
