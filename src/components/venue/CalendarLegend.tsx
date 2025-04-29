
import React from 'react';

const CalendarLegend: React.FC = () => {
  return (
    <div className="p-3 border-t border-border bg-muted/20">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#FEE2E2] rounded-full"></span>
          <span className="text-xs">Fully booked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#DBEAFE] rounded-full"></span>
          <span className="text-xs">Day booked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#FEF3C7] rounded-full"></span>
          <span className="text-xs">Some hours booked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#F3E8FF] rounded-full"></span>
          <span className="text-xs">Blocked by owner (not available)</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarLegend;
