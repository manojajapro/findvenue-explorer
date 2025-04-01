
import React from 'react';

interface MapControlsProps {
  isDrawingRadius: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({ isDrawingRadius }) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <style>
        {`
          .map-container {
            cursor: ${isDrawingRadius ? 'crosshair' : 'default'};
          }
        `}
      </style>
    </div>
  );
};

export default MapControls;
