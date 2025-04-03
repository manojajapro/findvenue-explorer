import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, CheckCircle, XCircle, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const formatBookingDate = (dateString: string) => {
  try {
    if (dateString.includes('-') && dateString.split('-').length === 3) {
      const dateParts = dateString.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      
      const date = new Date(year, month, day);
      return format(date, 'MMMM d, yyyy');
    }
    
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  } catch (e) {
    console.error("Error formatting date:", e, dateString);
    return dateString;
  }
};

const CustomerBookings = () => {
  const { user, isVenueOwner } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [error, setError] = useState<string | null>(null);
  const [processingBookingIds, setProcessingBookingIds] = useState<Set<string>>(new Set());
  
  const fetchBookings = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching bookings for user:', user.id, 'isVenueOwner:', isVenueOwner);
      
      if (isVenueOwner) {
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('id, name, owner_info');
          
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
            user_id
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
        
        const formattedBookings = (bookingsData || []).map(booking => {
          const userProfile = userProfiles?.find(profile => profile.id === booking.user_id) || null;
          return {
            id: booking.id,
            user_id: booking.user_id,
            user_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown Customer',
            user_email: userProfile?.email,
            venue_id: booking.venue_id,
            venue_name: booking.venue_name || 'Unnamed Venue',
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status,
            total_price: booking.total_price,
            created_at: booking.created_at,
            guests: booking.guests,
            special_requests: booking.special_requests,
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
  
  const { updateBookingStatus, isBusy } = useBookingStatusUpdate(fetchBookings);

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
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
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
  
  const getBookingGroups = () => {
    const groups: Record<string, any[]> = {};
    
    displayBookings.forEach(booking => {
      const key = `${booking.booking_date}-${booking.venue_id}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(booking);
    });
    
    return groups;
  };
  
  const bookingGroups = getBookingGroups();
  
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
          
          <div className="mb-6 flex space-x-2">
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
            <Card className="glass-card border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Customer</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(bookingGroups).map(groupKey => {
                      const group = bookingGroups[groupKey];
                      const firstBooking = group[0];
                      const hasMultipleBookings = group.length > 1;
                      const dateDisplay = formatBookingDate(firstBooking.booking_date);
                      
                      return group.map((booking, idx) => (
                        <TableRow key={booking.id} className={`border-white/10 ${hasMultipleBookings ? 'bg-findvenue-surface/20' : ''}`}>
                          <TableCell className="font-medium">{booking.user_name}</TableCell>
                          <TableCell>{booking.venue_name}</TableCell>
                          <TableCell>{dateDisplay}</TableCell>
                          <TableCell>{booking.start_time} - {booking.end_time}</TableCell>
                          <TableCell>{booking.guests}</TableCell>
                          <TableCell>SAR {booking.total_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {booking.status === 'pending' && activeTab === 'upcoming' && (
                              <div className="flex space-x-2 justify-end">
                                <Button 
                                  variant="outline"
                                  className="border-green-500 text-green-500 hover:bg-green-500/10"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                                  disabled={processingBookingIds.has(booking.id) || isBusy}
                                >
                                  {processingBookingIds.has(booking.id) ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full mr-1"></div>
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Confirm
                                </Button>
                                
                                <Button 
                                  variant="outline"
                                  className="border-destructive text-destructive hover:bg-destructive/10"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                  disabled={processingBookingIds.has(booking.id) || isBusy}
                                >
                                  {processingBookingIds.has(booking.id) ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full mr-1"></div>
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Cancel
                                </Button>
                              </div>
                            )}
                            {!processingBookingIds.has(booking.id) && booking.status !== 'pending' && (
                              <div className="flex space-x-2 justify-end">
                                <span className="text-findvenue-text-muted text-sm mr-2">
                                  {booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-findvenue text-findvenue hover:bg-findvenue/10"
                                  onClick={() => initiateChat(booking.user_id)}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
                            {booking.venue_name} - {formatBookingDate(booking.booking_date)}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-findvenue hover:bg-findvenue/10"
                            onClick={() => initiateChat(booking.user_id)}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
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
