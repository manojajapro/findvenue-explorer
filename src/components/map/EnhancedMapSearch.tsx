
import { useState } from 'react';
import { Search, MapPin, Navigation, Plus, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useGeocode } from '@/hooks/useGeocode';
import { toast } from 'sonner';

interface EnhancedMapSearchProps {
  onSearchLocation: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  initialRadius?: number;
}

const EnhancedMapSearch = ({ 
  onSearchLocation, 
  onRadiusChange,
  initialRadius = 10
}: EnhancedMapSearchProps) => {
  const [pinCode, setPinCode] = useState('');
  const [radius, setRadius] = useState(initialRadius);
  const { geocodePinCode, isLoading: isGeocodingLoading } = useGeocode();

  const handlePinCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) {
      toast.error('Please enter a PIN code');
      return;
    }
    
    const location = await geocodePinCode(pinCode);
    if (location) {
      onSearchLocation(location.lat, location.lng);
      toast.success(`Found location: ${location.formattedAddress}`);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.info('Getting your current location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onSearchLocation(latitude, longitude);
        toast.success('Using your current location');
      },
      () => {
        toast.error('Unable to retrieve your location');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    onRadiusChange(newRadius);
  };

  const increaseRadius = () => {
    const newRadius = Math.min(25, radius + 5);
    setRadius(newRadius);
    onRadiusChange(newRadius);
  };

  const decreaseRadius = () => {
    const newRadius = Math.max(1, radius - 5);
    setRadius(newRadius);
    onRadiusChange(newRadius);
  };

  return (
    <div className="bg-findvenue-surface/80 border border-white/10 rounded-lg p-3 shadow-lg w-full">
      <form onSubmit={handlePinCodeSearch} className="flex gap-2 mb-3">
        <div className="relative flex-grow">
          <MapPin className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
          <Input 
            type="text"
            placeholder="Search by PIN code..."
            className="pl-9 bg-findvenue-surface/50 border-white/10"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
          />
        </div>
        <Button 
          type="submit" 
          className="bg-findvenue hover:bg-findvenue-dark"
          disabled={isGeocodingLoading}
        >
          <Search className="h-4 w-4 mr-1" />
          {isGeocodingLoading ? 'Searching...' : 'Search'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="border-white/10"
          onClick={getCurrentLocation}
          title="Use current location"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Search Radius: {radius} km</span>
          <div className="flex gap-1">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={decreaseRadius}
              disabled={radius <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={increaseRadius}
              disabled={radius >= 25}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Slider
          value={[radius]}
          min={1}
          max={25}
          step={1}
          onValueChange={handleRadiusChange}
        />
      </div>
    </div>
  );
};

export default EnhancedMapSearch;
