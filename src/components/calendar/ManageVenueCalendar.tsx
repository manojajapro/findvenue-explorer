import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockedDatesCalendarTabs } from './BlockedDatesCalendarTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function ManageVenueCalendar() {
  const { user } = useAuth();
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
        
        if (ownerVenues && ownerVenues.length > 0) {
          setSelectedVenue(ownerVenues[0].id);
        }
      } catch (error) {
        console.error("Error fetching owner venues:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOwnerVenues();
  }, [user]);
  
  const selectedVenueName = venues.find(v => v.id === selectedVenue)?.name;
  
  if (loading) {
    return <div>Loading your venues...</div>;
  }
  
  if (venues.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p>You don't have any venues to manage.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
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
  );
}

export default ManageVenueCalendar;
