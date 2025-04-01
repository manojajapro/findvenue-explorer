
import { Locate, MapIcon, Navigation, ZoomIn, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MapControlsProps {
  isCompactControls: boolean;
  isRadiusActive: boolean;
  toggleRadiusSearch: () => void;
  handleManualLocationSetting: () => void;
  handleClearSearch: () => void;
  fitBoundsToMarkers: () => void;
  resetToDefaultLocation: () => void;
}

const MapControls = ({
  isCompactControls,
  isRadiusActive,
  toggleRadiusSearch,
  handleManualLocationSetting,
  handleClearSearch,
  fitBoundsToMarkers,
  resetToDefaultLocation
}: MapControlsProps) => {
  return (
    <TooltipProvider>
      <div className={`absolute ${isCompactControls ? 'bottom-4 right-4' : 'top-20 right-4'} z-[1000] flex ${isCompactControls ? 'flex-row' : 'flex-col'} gap-2`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className={`h-8 w-8 ${isRadiusActive ? 'bg-findvenue text-white' : 'bg-findvenue-surface/80'} backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md`}
              onClick={toggleRadiusSearch}
            >
              <Locate className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
            <p>{isRadiusActive ? 'Disable radius search' : 'Enable radius search'}</p>
          </TooltipContent>
        </Tooltip>
        
        {isRadiusActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
                onClick={handleManualLocationSetting}
              >
                <MapIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
              <p>Set location manually (click on map)</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
              onClick={resetToDefaultLocation}
            >
              <Navigation className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
            <p>Use default location (Riyadh)</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
              onClick={handleClearSearch}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
            <p>Clear filters</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 bg-findvenue-surface/80 backdrop-blur-md border-white/10 hover:bg-findvenue shadow-md"
              onClick={fitBoundsToMarkers}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isCompactControls ? "left" : "left"} className="text-xs">
            <p>Zoom to fit all venues</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default MapControls;
