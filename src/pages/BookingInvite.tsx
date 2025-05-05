
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Check, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BookingInvite = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching booking with ID:", id);
        
        // Fetch booking details
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            venue_name,
            booking_date,
            start_time,
            end_time,
            status,
            guests,
            special_requests,
            address,
            total_price,
            customer_email,
            customer_phone
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching booking details:', error);
          setError('Unable to load booking details. This booking may not exist or has been removed.');
          return;
        }
        
        if (!data) {
          console.error('No booking found with ID:', id);
          setError('Booking not found');
          return;
        }
        
        console.log("Booking data loaded:", data);
        setBooking(data);
      } catch (err) {
        console.error('Exception in fetching booking:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-teal-500 text-slate-900';
      case 'pending':
        return 'bg-amber-500 text-slate-900';
      case 'cancelled':
        return 'bg-red-500/80 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const handleAccept = async () => {
    try {
      // Update the booking invite status in the database
      const { error } = await supabase
        .from('booking_invites')
        .update({ status: 'accepted' })
        .eq('booking_id', id)
        .eq('email', booking?.customer_email);
        
      if (error) {
        console.error('Error updating invite status:', error);
        toast({ 
          title: "Failed to accept invitation", 
          description: "There was an error processing your response.",
          variant: "destructive" 
        });
        return;
      }
      
      toast({ 
        title: "Accepted invitation", 
        description: "The host has been notified of your attendance."
      });
    } catch (err) {
      console.error('Exception in accepting invitation:', err);
      toast({ 
        title: "An error occurred", 
        description: "Please try again later.",
        variant: "destructive" 
      });
    }
  };

  const handleDecline = async () => {
    try {
      // Update the booking invite status in the database
      const { error } = await supabase
        .from('booking_invites')
        .update({ status: 'declined' })
        .eq('booking_id', id)
        .eq('email', booking?.customer_email);
        
      if (error) {
        console.error('Error updating invite status:', error);
        toast({ 
          title: "Failed to decline invitation", 
          description: "There was an error processing your response.",
          variant: "destructive" 
        });
        return;
      }
      
      toast({ 
        title: "Declined invitation", 
        description: "The host has been notified that you can't attend."
      });
    } catch (err) {
      console.error('Exception in declining invitation:', err);
      toast({ 
        title: "An error occurred", 
        description: "Please try again later.",
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-xl text-red-500 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">{error}</p>
          </CardContent>
          <CardFooter>
            <Link to="/" className="w-full">
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                Return to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="max-w-lg w-full bg-slate-900 border-slate-800 text-white">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-teal-400">
              Event Invitation
            </CardTitle>
            <Badge className={getStatusColor(booking.status)}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{booking.venue_name}</h2>
          </div>

          <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-medium mb-2 text-teal-400">Event Details:</h3>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-teal-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-300">Date</p>
                <p className="text-white">{formatDate(booking.booking_date)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-teal-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-300">Time</p>
                <p className="text-white">{booking.start_time} - {booking.end_time}</p>
              </div>
            </div>
            
            {booking.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-teal-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Location</p>
                  <p className="text-white">{booking.address}</p>
                </div>
              </div>
            )}
            
            {booking.guests > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-teal-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Guests</p>
                  <p className="text-white">{booking.guests} people</p>
                </div>
              </div>
            )}
            
            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm font-medium text-slate-300 mb-1">Special Requests:</p>
                <p className="text-white">{booking.special_requests}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-slate-800 pt-4">
          <div className="grid grid-cols-2 w-full gap-3">
            <Button 
              className="bg-teal-500 hover:bg-teal-600 text-slate-900 flex items-center gap-2"
              onClick={handleAccept}
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
            <Button 
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              onClick={handleDecline}
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
          </div>
          
          <p className="text-xs text-center text-slate-500 mt-4">
            This invitation was sent via FindVenue
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BookingInvite;
