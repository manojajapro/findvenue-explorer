
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OwnerBookingsCalendar } from './OwnerBookingsCalendar';
import { VenueBlockedDates } from './VenueBlockedDates';

interface BlockedDatesCalendarTabsProps {
  venueId: string;
  venueName?: string;
}

export function BlockedDatesCalendarTabs({ venueId, venueName }: BlockedDatesCalendarTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("bookings");

  return (
    <Tabs defaultValue="bookings" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-2 mb-8">
        <TabsTrigger value="bookings">Bookings Calendar</TabsTrigger>
        <TabsTrigger value="blocked-dates">Block Off Dates</TabsTrigger>
      </TabsList>
      
      <TabsContent value="bookings" className="mt-0">
        <OwnerBookingsCalendar />
      </TabsContent>
      
      <TabsContent value="blocked-dates" className="mt-0">
        <VenueBlockedDates venueId={venueId} venueName={venueName} />
      </TabsContent>
    </Tabs>
  );
}

export default BlockedDatesCalendarTabs;
