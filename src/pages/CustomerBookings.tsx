
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate';
import { CustomerBookingsTable } from '@/components/booking/CustomerBookingsTable';
import { OwnerBookingsCalendar } from '@/components/calendar/OwnerBookingsCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { enableRealtimeForTable, sendNotification, getVenueOwnerId } from '@/utils/supabaseRealtime';
import BookingOwnerChat from '@/components/bookings/BookingOwnerChat';

const CustomerBookings = () => {
  const { user, isVenueOwner } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [error, setError] = useState<string | null>(null);
  const [processingBookingIds, setProcessingBookingIds] = useState<Set<string>>(new Set());
  
  // Enable realtime for the bookings table
  useEffect(() => {
    enableRealtimeForTable('bookings');
    enableRealtimeForTable('notifications');
  }, []);
  
  const fetchBookings = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching bookings for user:', user.id, 'isVenueOwner:', isVenueOwner);
      
      if (isVenueOwner) {
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('id, name, gallery_images, owner_info');
          
        if (venuesError) {
          console.error('Error fetching venues:', venuesError);
          throw venuesError;
        }
        
        console.log('All venues fetched:', venuesData);
        
        const ownerVenues = venuesData?.filter(venue => {
          if (!venue.owner_info) return false;
          
          try {
            const ownerInfo = typeof venue.owner_info === 'string' 
              ? JSON.parse(venue.owner_info) 
              : venue.owner_info;
              
            return ownerInfo.user_id === user.id;
          } catch (e) {
            console.error("Error parsing owner_info for venue", venue.id, e);
            return false;
          }
        });
        
        console.log('Owner venues filtered:', ownerVenues);
        
        if (!ownerVenues || ownerVenues.length === 0) {
          console.log('No venues found for this owner');
          setBookings([]);
          setIsLoading(false);
          return;
        }
        
        const venueIds = ownerVenues.map(venue => venue.id);
        console.log('Owner venue IDs:', venueIds);
        
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            venue_id,
            venue_name,
            booking_date,
            start_time,
            end_time,
            status,
            total_price,
            created_at,
            guests,
            special_requests,
            user_id,
            customer_email,
            customer_phone,
            payment_method
          `)
          .in('venue_id', venueIds);
          
        if (bookingsError) {
          console.error('Error fetching bookings with venue IDs:', bookingsError);
          throw bookingsError;
        }
        
        console.log('Venue owner bookings fetched:', bookingsData);
        
        const userIds = (bookingsData || []).map(booking => booking.user_id);
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
          
        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError);
        }
        
        // Add venue image data to bookings
        const venueImagesMap = ownerVenues.reduce((acc, venue) => {
          if (venue.gallery_images && Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) {
            acc[venue.id] = venue.gallery_images[0];
          }
          return acc;
        }, {});
        
        const formattedBookings = (bookingsData || []).map(booking => {
          const userProfile = userProfiles?.find(profile => profile.id === booking.user_id) || null;
          return {
            id: booking.id,
            user_id: booking.user_id,
            user_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown Customer',
            user_email: booking.customer_email || userProfile?.email,
            customer_phone: booking.customer_phone,
            venue_id: booking.venue_id,
            venue_name: booking.venue_name || 'Unnamed Venue',
            venue_image: venueImagesMap[booking.venue_id] || '',
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status,
            total_price: booking.total_price,
            created_at: booking.created_at,
            guests: booking.guests,
            special_requests: booking.special_requests,
            payment_method: booking.payment_method,
          };
        });
        
        setBookings(formattedBookings);
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('booking_date', { ascending: false });
          
        if (error) {
          console.error('Error fetching customer bookings:', error);
          throw error;
        }
        
        console.log('Customer bookings fetched:', data);
        setBookings(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(error.message || 'Failed to load bookings.');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bookings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isVenueOwner, toast]);
  
  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchBookings]);
  
  // Set up realtime subscription for bookings
  useEffect(() => {
    if (!user) return;

    // Subscribe to bookings changes for this user
    const channel = supabase
      .channel('bookings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: isVenueOwner 
            ? undefined 
            : `user_id=eq.${user.id}`
        }, 
        async (payload) => {
          console.log('Booking change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newBooking = payload.new;
            
            // For venue owners, check if this booking is for one of their venues
            if (isVenueOwner) {
              const venueIds = bookings.map(b => b.venue_id);
              if (!venueIds.includes(newBooking.venue_id)) {
                // Not for owner's venue, ignore
                return;
              }
              
              // Send notification to venue owner
              await sendNotification(
                user.id,
                'New Booking Received',
                `A new booking has been created for ${newBooking.venue_name}.`,
                'booking',
                '/customer-bookings'
              );
            } else {
              // Customer made a booking, send notification to venue owner
              const ownerId = await getVenueOwnerId(newBooking.venue_id);
              if (ownerId) {
                await sendNotification(
                  ownerId,
                  'New Booking Received',
                  `${user.email || 'A customer'} has booked your venue "${newBooking.venue_name}".`,
                  'booking',
                  '/customer-bookings'
                );
              }
            }
            
            // Add the new booking to the list
            setBookings(prev => [newBooking, ...prev]);
            toast({
              title: 'New Booking',
              description: `A new booking has been created for ${newBooking.venue_name}.`
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update existing booking
            setBookings(prev => 
              prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b)
            );
            
            if (payload.old.status !== payload.new.status) {
              // Status changed, send notification to customer
              if (!isVenueOwner && payload.new.user_id === user.id) {
                await sendNotification(
                  user.id,
                  'Booking Status Updated',
                  `Your booking for ${payload.new.venue_name} is now ${payload.new.status}.`,
                  'booking',
                  '/bookings'
                );
              }
              
              toast({
                title: 'Booking Status Changed',
                description: `Booking for ${payload.new.venue_name} is now ${payload.new.status}.`,
                variant: payload.new.status === 'confirmed' ? 'default' : 'destructive'
              });
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted booking
            setBookings(prev => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isVenueOwner, bookings, toast]);
  
  const { updateBookingStatus, notifyVenueOwner, isBusy } = useBookingStatusUpdate(fetchBookings);

  const handleStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    if (processingBookingIds.has(bookingId) || isBusy) {
      console.log(`Already processing booking ${bookingId}, ignoring duplicate request`);
      return;
    }
    
    try {
      setProcessingBookingIds(prev => new Set(prev).add(bookingId));
      
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      await updateBookingStatus(bookingId, status, booking, setBookings);
      
      // Send notification to customer
      if (booking.user_id) {
        await sendNotification(
          booking.user_id,
          `Booking ${status === 'confirmed' ? 'Confirmed' : 'Cancelled'}`,
          `Your booking for ${booking.venue_name} on ${new Date(booking.booking_date).toLocaleDateString()} has been ${status}.`,
          'booking',
          '/bookings'
        );
      }
      
      await fetchBookings();
      
      toast({
        title: `Booking ${status === 'confirmed' ? 'Confirmed' : 'Cancelled'}`,
        description: `The booking status has been updated to ${status}.`,
      });
    } catch (error: any) {
      console.error(`Error handling status update for booking ${bookingId}:`, error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking status',
        variant: 'destructive',
      });
    } finally {
      setProcessingBookingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const initiateChat = (userId: string) => {
    console.log(`Initiating chat with user ${userId}`);
    navigate(`/messages/${userId}`);
  };
  
  const now = new Date();
  
  const upcomingBookings = bookings.filter(booking => 
    (booking.status === 'pending' || 
    (new Date(booking.booking_date) >= now && booking.status === 'confirmed'))
  );
  
  const pastBookings = bookings.filter(booking => 
    (booking.status === 'cancelled' || 
    (new Date(booking.booking_date) < now && booking.status === 'confirmed'))
  );
  
  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;
  
  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
            <p className="text-findvenue-text-muted">
              You need to be signed in to view bookings.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isVenueOwner) {
    return (
      <div className="min-h-screen pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
            <p className="text-findvenue-text-muted">
              You need to be a venue owner to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Customer Bookings</h1>
          <p className="text-findvenue-text-muted mb-8">
            Manage bookings for all your venues
          </p>
          
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex space-x-2">
              <Button
                variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setActiveTab('upcoming')}
                className={activeTab === 'upcoming' ? 'bg-findvenue hover:bg-findvenue-dark' : ''}
              >
                Upcoming ({upcomingBookings.length})
              </Button>
              <Button
                variant={activeTab === 'past' ? 'default' : 'outline'}
                onClick={() => setActiveTab('past')}
                className={activeTab === 'past' ? 'bg-findvenue hover:bg-findvenue-dark' : ''}
              >
                Past & Cancelled ({pastBookings.length})
              </Button>
            </div>
            
            <div className="ms-auto flex space-x-2">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-findvenue hover:bg-findvenue-dark' : ''}
                size="sm"
              >
                Calendar View
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-findvenue hover:bg-findvenue-dark' : ''}
                size="sm"
              >
                Table View
              </Button>
            </div>
          </div>
          
          {error && (
            <Card className="glass-card border-white/10 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Error loading bookings</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
                <Button 
                  onClick={fetchBookings} 
                  variant="outline" 
                  className="mt-3"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue mx-auto"></div>
              <p className="mt-4 text-findvenue-text-muted">Loading bookings...</p>
            </div>
          ) : displayBookings.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-findvenue-text-muted">
                  {activeTab === 'upcoming' 
                    ? "You don't have any upcoming customer bookings" 
                    : "You don't have any past customer bookings"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="calendar" value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'calendar')}>
              <TabsContent value="calendar">
                <Card className="glass-card border-white/10">
                  <CardContent className="p-4">
                    <OwnerBookingsCalendar />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="table">
                <Card className="glass-card border-white/10 overflow-hidden">
                  <CardContent className="p-0">
                    <CustomerBookingsTable 
                      bookings={displayBookings}
                      activeTab={activeTab}
                      processingBookingIds={processingBookingIds}
                      isBusy={isBusy}
                      handleStatusUpdate={handleStatusUpdate}
                      initiateChat={initiateChat}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          
          {displayBookings.some(booking => booking.special_requests) && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Special Requests</h2>
              <div className="space-y-4">
                {displayBookings.filter(booking => booking.special_requests).map(booking => (
                  <Card key={`req-${booking.id}`} className="glass-card border-white/10">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <h3 className="font-medium">
                            {booking.venue_name} - {new Date(booking.booking_date).toLocaleDateString()}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-findvenue hover:bg-findvenue/10"
                            onClick={() => initiateChat(booking.user_id)}
                          >
                            Chat with Customer
                          </Button>
                        </div>
                        <p className="text-sm text-findvenue-text-muted">
                          <span className="font-medium">{booking.user_name}</span> - {booking.guests} guests
                        </p>
                        <div className="bg-findvenue-surface/20 p-3 rounded-md mt-2">
                          <p className="text-findvenue-text-muted text-sm">{booking.special_requests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerBookings;
