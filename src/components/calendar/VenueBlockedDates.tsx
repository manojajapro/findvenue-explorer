
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { CalendarX, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  venue_id: string;
}

interface VenueBlockedDatesProps {
  venueId: string;
  venueName?: string;
}

export function VenueBlockedDates({ venueId, venueName }: VenueBlockedDatesProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState<string>('');
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch blocked dates for this venue
  const fetchBlockedDates = async () => {
    if (!venueId) return;
    
    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('venue_id', venueId)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      setBlockedDates(data || []);
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      toast({
        variant: "destructive",
        title: "Failed to load blocked dates",
        description: "There was a problem loading the blocked dates. Please try again later.",
      });
    }
  };
  
  useEffect(() => {
    fetchBlockedDates();
    
    // Subscribe to changes in the blocked_dates table
    const channel = supabase
      .channel('blocked_dates_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'blocked_dates',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        fetchBlockedDates();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  const blockDate = async () => {
    if (!selectedDate || !venueId) return;
    
    setIsLoading(true);
    
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if the date is already blocked
      const existingBlock = blockedDates.find(bd => bd.date === dateString);
      
      if (existingBlock) {
        toast({
          variant: "destructive",
          title: "Date already blocked",
          description: "This date is already blocked in the calendar.",
        });
        setIsLoading(false);
        return;
      }
      
      // Check if there are any bookings on this date
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('venue_id', venueId)
        .eq('booking_date', dateString)
        .neq('status', 'cancelled');
        
      if (bookingsError) throw bookingsError;
      
      if (bookingsData && bookingsData.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot block this date",
          description: "There are existing bookings on this date. Cancel those bookings first.",
        });
        setIsLoading(false);
        return;
      }
      
      // Block the date
      const { error } = await supabase
        .from('blocked_dates')
        .insert({
          venue_id: venueId,
          date: dateString,
          reason: reason || null
        });
        
      if (error) throw error;
      
      toast({
        title: "Date blocked successfully",
        description: `${format(selectedDate, 'MMMM d, yyyy')} has been marked as unavailable.`,
      });
      
      setReason('');
      fetchBlockedDates();
    } catch (error: any) {
      console.error('Error blocking date:', error);
      toast({
        variant: "destructive",
        title: "Failed to block date",
        description: error.message || "There was a problem blocking the date.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const unblockDate = async (id: string) => {
    setIsDeleting(id);
    
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Date unblocked",
        description: "The date has been made available again.",
      });
      
      fetchBlockedDates();
    } catch (error: any) {
      console.error('Error unblocking date:', error);
      toast({
        variant: "destructive",
        title: "Failed to unblock date",
        description: error.message || "There was a problem unblocking the date.",
      });
    } finally {
      setIsDeleting(null);
    }
  };
  
  // Convert blocked dates to Date objects for the calendar
  const blockedDateObjects = blockedDates.map(bd => new Date(bd.date));
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Block Off Dates</CardTitle>
            <CardDescription>
              Block dates when the venue is unavailable for booking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    blocked: blockedDateObjects
                  }}
                  modifiersStyles={{
                    blocked: {
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      textDecoration: 'line-through'
                    }
                  }}
                  components={{
                    DayContent: ({ date, activeModifiers }) => {
                      return (
                        <div className="relative flex items-center justify-center w-full h-full">
                          <span className={activeModifiers.selected ? 'text-white' : ''}>
                            {date.getDate()}
                          </span>
                          {activeModifiers.blocked && (
                            <CalendarX className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-3 w-3 text-red-500" />
                          )}
                        </div>
                      );
                    }
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Input 
                  placeholder="Reason for blocking (optional)" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button 
                  onClick={blockDate}
                  className="w-full"
                  disabled={isLoading || !selectedDate}
                >
                  {isLoading ? 'Saving...' : 'Block This Date'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Blocked Dates</CardTitle>
            <CardDescription>
              Manage dates that are blocked off for {venueName || 'this venue'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blockedDates.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No dates are currently blocked.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {blockedDates.map((blockedDate) => (
                  <div 
                    key={blockedDate.id} 
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div>
                      <div className="font-medium">
                        {format(new Date(blockedDate.date), 'MMMM d, yyyy')}
                      </div>
                      {blockedDate.reason && (
                        <div className="text-sm text-muted-foreground">
                          {blockedDate.reason}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unblockDate(blockedDate.id)}
                      disabled={isDeleting === blockedDate.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VenueBlockedDates;
