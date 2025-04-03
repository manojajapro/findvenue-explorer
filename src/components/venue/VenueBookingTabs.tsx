
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingForm from '@/components/venue/BookingForm';
import MultiDayBookingForm from '@/components/venue/MultiDayBookingForm';
import RangeBookingForm from '@/components/venue/RangeBookingForm';
import { Calendar, Users } from 'lucide-react';

interface VenueBookingTabsProps {
  venueId: string;
  venueName: string;
  pricePerHour?: number;
  minCapacity?: number;
  maxCapacity?: number;
  ownerId: string;
  ownerName: string;
}

export default function VenueBookingTabs({
  venueId,
  venueName,
  pricePerHour = 0,
  minCapacity = 1,
  maxCapacity = 100,
  ownerId,
  ownerName
}: VenueBookingTabsProps) {
  const [activeTab, setActiveTab] = useState('single-day');

  return (
    <Tabs defaultValue="single-day" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="single-day" className="text-xs sm:text-sm flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Single Day</span>
        </TabsTrigger>
        <TabsTrigger value="multi-day" className="text-xs sm:text-sm flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Multiple Days</span>
        </TabsTrigger>
        <TabsTrigger value="date-range" className="text-xs sm:text-sm flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Date Range</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="single-day">
        <BookingForm 
          venueId={venueId} 
          venueName={venueName} 
          pricePerHour={pricePerHour} 
          ownerId={ownerId}
          ownerName={ownerName}
        />
      </TabsContent>
      
      <TabsContent value="multi-day">
        <MultiDayBookingForm 
          venueId={venueId} 
          venueName={venueName} 
          pricePerHour={pricePerHour}
          minCapacity={minCapacity}
          maxCapacity={maxCapacity}
        />
      </TabsContent>
      
      <TabsContent value="date-range">
        <RangeBookingForm 
          venueId={venueId} 
          venueName={venueName} 
          pricePerHour={pricePerHour}
          minCapacity={minCapacity}
          maxCapacity={maxCapacity}
        />
      </TabsContent>
    </Tabs>
  );
}
