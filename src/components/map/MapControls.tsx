
import { useState } from 'react';
import { Search, MapPin, Navigation, Plus, Minus, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import EnhancedMapSearch from './EnhancedMapSearch';
import { useIsMobile } from '@/hooks/use-mobile';

interface MapControlsProps {
  onSearchLocation: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  initialRadius?: number;
}

const MapControls = ({ 
  onSearchLocation, 
  onRadiusChange,
  initialRadius = 10 
}: MapControlsProps) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10 w-11/12 max-w-md">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="w-full flex justify-between items-center">
              <span className="flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Search Area
              </span>
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Card className="border-0 shadow-none">
              <EnhancedMapSearch 
                onSearchLocation={onSearchLocation}
                onRadiusChange={onRadiusChange}
                initialRadius={initialRadius}
              />
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="absolute top-3 left-3 z-10 w-80">
      <EnhancedMapSearch 
        onSearchLocation={onSearchLocation}
        onRadiusChange={onRadiusChange}
        initialRadius={initialRadius}
      />
    </div>
  );
};

export default MapControls;
