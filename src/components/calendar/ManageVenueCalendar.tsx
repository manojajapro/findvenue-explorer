
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockedDatesCalendarTabs } from './BlockedDatesCalendarTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function ManageVenueCalendar() {
  const { user } = useAuth();
  const { id: venueIdFromUrl } = useParams<{ id: string }>();
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [venues, setVenues] = useState<Array<{ id: string, name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnerVenues = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('id, name, owner_info');
          
        if (error) throw error;
        
        const ownerVenues = data
          ?.filter(venue => {
            try {
              const ownerInfo = typeof venue.owner_info === 'string'
                ? JSON.parse(venue.owner_info)
                : venue.owner_info;
                
              return ownerInfo?.user_id === user.id;
            } catch (e) {
              console.error("Error parsing owner_info:", e);
              return false;
            }
          })
          .map(venue => ({
            id: venue.id,
            name: venue.name
          }));
          
        setVenues(ownerVenues || []);
        
        // Set the venue from URL if available, otherwise use the first venue
        if (venueIdFromUrl && ownerVenues?.some(venue => venue.id === venueIdFromUrl)) {
          setSelectedVenue(venueIdFromUrl);
        } else if (ownerVenues && ownerVenues.length > 0) {
          setSelectedVenue(ownerVenues[0].id);
        }
      } catch (error) {
        console.error("Error fetching owner venues:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOwnerVenues();
  }, [user, venueIdFromUrl]);
  
  const selectedVenueName = venues.find(v => v.id === selectedVenue)?.name;
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-findvenue"></div>
        </div>
      </div>
    );
  }
  
  if (venues.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <p>You don't have any venues to manage.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <Card>
        <CardHeader>
          <CardTitle>Venue Calendar Management</CardTitle>
        </CardHeader>
        <CardContent>
          {venues.length > 1 && (
            <div className="mb-6">
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {selectedVenue && (
            <BlockedDatesCalendarTabs 
              venueId={selectedVenue} 
              venueName={selectedVenueName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ManageVenueCalendar;
