
import { Button } from '@/components/ui/button';
import { Search, MapPin, ZoomIn, RefreshCcw, Volume2, MapIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MapControlsProps {
  isCompactControls: boolean;
  isRadiusActive: boolean;
  toggleRadiusSearch: () => void;
  handleManualLocationSetting: () => void;
  handleClearSearch: () => void;
  fitBoundsToMarkers: () => void;
  resetToDefaultLocation: () => void;
  getCurrentLocation?: () => void;
}

const MapControls = ({
  isCompactControls,
  isRadiusActive,
  toggleRadiusSearch,
  handleManualLocationSetting,
  handleClearSearch,
  fitBoundsToMarkers,
  resetToDefaultLocation,
  getCurrentLocation
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
      {isCompactControls && (
        <Button
          className="bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 shadow-md"
          size="icon"
          onClick={() => setShowControls(!showControls)}
        >
          <MapIcon className="h-4 w-4" />
        </Button>
      )}
      
      {(showControls || !isCompactControls) && (
        <div className={`flex ${isCompactControls ? 'flex-col' : 'flex-row'} gap-2`}>
          <Button
            className={`bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 shadow-md ${
              isRadiusActive ? 'border-green-500 text-green-500' : ''
            }`}
            size={isCompactControls ? 'icon' : 'default'}
            onClick={toggleRadiusSearch}
          >
            {isCompactControls ? (
              <MapPin className="h-4 w-4" />
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" /> {isRadiusActive ? 'Disable Radius' : 'Enable Radius'}
              </>
            )}
          </Button>

          {isRadiusActive && (
            <Button
              className="bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 shadow-md"
              size={isCompactControls ? 'icon' : 'default'}
              onClick={handleManualLocationSetting}
            >
              {isCompactControls ? (
                <MapPin className="h-4 w-4" />
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" /> Set Location
                </>
              )}
            </Button>
          )}
          
          {getCurrentLocation && (
            <Button
              className="bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 shadow-md"
              size={isCompactControls ? 'icon' : 'default'}
              onClick={handleGetCurrentLocation}
            >
              {isCompactControls ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" /> My Location
                </>
              )}
            </Button>
          )}
          
          <Button
            className="bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 shadow-md"
            size={isCompactControls ? 'icon' : 'default'}
            onClick={fitBoundsToMarkers}
          >
            {isCompactControls ? (
              <ZoomIn className="h-4 w-4" />
            ) : (
              <>
                <ZoomIn className="h-4 w-4 mr-2" /> Fit to Markers
              </>
            )}
          </Button>

          {isRadiusActive && (
            <Button
              className="bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 shadow-md"
              size={isCompactControls ? 'icon' : 'default'}
              onClick={resetToDefaultLocation}
            >
              {isCompactControls ? (
                <RefreshCcw className="h-4 w-4" />
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Reset Location
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MapControls;
