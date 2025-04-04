
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingForm from '@/components/venue/BookingForm';
import MultiDayBookingForm from '@/components/venue/MultiDayBookingForm';
import { Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  const [activeTab, setActiveTab] = useState('hourly');
  const { user } = useAuth();
  const isOwner = user?.id === ownerId;

  // Don't show booking tabs for the venue owner
  if (isOwner) {
    return (
      <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
        <p className="text-center text-findvenue-text-muted">
          This is your venue. You cannot book your own venue.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-findvenue-card-bg p-4 rounded-lg border border-white/10">
      <h3 className="text-lg font-semibold mb-4">Book this venue</h3>
      
      <Tabs defaultValue="hourly" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="hourly" className="text-xs sm:text-sm flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Hourly Booking</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="text-xs sm:text-sm flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Day Booking</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="hourly">
          <BookingForm 
            venueId={venueId} 
            venueName={venueName} 
            pricePerHour={pricePerHour} 
            ownerId={ownerId}
            ownerName={ownerName}
          />
        </TabsContent>
        
        <TabsContent value="daily">
          <MultiDayBookingForm 
            venueId={venueId} 
            venueName={venueName} 
            pricePerHour={pricePerHour}
            minCapacity={minCapacity}
            maxCapacity={maxCapacity}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
