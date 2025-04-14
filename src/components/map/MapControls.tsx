
import { Button } from '@/components/ui/button';
import { Search, MapPin, ZoomIn, RefreshCcw, Volume2, MapIcon, Plus, Minus, Navigation, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MapControlsProps {
  isCompactControls: boolean;
  isRadiusActive: boolean;
  radiusSize?: number;
  toggleRadiusSearch: () => void;
  handleManualLocationSetting: (coordinates?: [number, number]) => void;
  handleClearSearch?: () => void;
  fitBoundsToMarkers: () => void;
  resetToDefaultLocation: () => void;
  getCurrentLocation?: () => void;
  increaseRadius?: () => void;
  decreaseRadius?: () => void;
  currentLocation?: [number, number];
  setRadiusSize?: (size: number) => void;
}

const MapControls = ({
  isCompactControls,
  isRadiusActive,
  radiusSize = 0,
  toggleRadiusSearch,
  handleManualLocationSetting,
  handleClearSearch,
  fitBoundsToMarkers,
  resetToDefaultLocation,
  getCurrentLocation,
  increaseRadius,
  decreaseRadius,
  currentLocation,
  setRadiusSize
}: MapControlsProps) => {
  const [showControls, setShowControls] = useState(!isCompactControls);
  const isMobile = useIsMobile();
  
  // When controls change from compact to full, show them
  useEffect(() => {
    setShowControls(!isCompactControls);
  }, [isCompactControls]);
  
  const handleGetCurrentLocation = () => {
    if (!getCurrentLocation) return;
    
    getCurrentLocation();
  };
  
  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-col gap-2 bg-black/70 backdrop-blur-md rounded-lg p-2 border border-white/10 shadow-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`hover:bg-white/10 ${
                  isRadiusActive ? 'text-green-500 border-green-500/50 bg-green-500/10' : 'text-white/80'
                }`}
                onClick={toggleRadiusSearch}
              >
                <Target className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
              {isRadiusActive ? 'Disable Radius Search' : 'Enable Radius Search'}
            </TooltipContent>
          </Tooltip>

          {isRadiusActive && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-white/10 text-white/80"
                    onClick={() => handleManualLocationSetting(currentLocation)}
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
                  Set Location
                </TooltipContent>
              </Tooltip>
              
              {increaseRadius && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10 text-white/80"
                      onClick={increaseRadius}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
                    Increase Radius
                  </TooltipContent>
                </Tooltip>
              )}
              
              {decreaseRadius && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10 text-white/80"
                      onClick={decreaseRadius}
                      disabled={radiusSize <= 1}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
                    Decrease Radius
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
          
          <div className="w-full h-px bg-white/10 my-1"></div>
          
          {getCurrentLocation && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-white/10 text-white/80"
                  onClick={handleGetCurrentLocation}
                >
                  <Navigation className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
                My Location
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-white/10 text-white/80"
                onClick={fitBoundsToMarkers}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
              Fit to Markers
            </TooltipContent>
          </Tooltip>

          {isRadiusActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-white/10 text-white/80"
                  onClick={resetToDefaultLocation}
                >
                  <RefreshCcw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-black/90 text-white border-white/10">
                Reset Location
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default MapControls;
