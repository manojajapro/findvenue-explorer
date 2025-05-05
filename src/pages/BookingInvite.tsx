
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Check, X, AlertCircle, Mail, User, Building, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ErrorDisplay from '@/components/chat/ErrorDisplay';

const BookingInvite = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [venue, setVenue] = useState<any>(null);
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  useEffect(() => {
    // Check if we already have the guest email in local storage
    const storedEmail = localStorage.getItem('guestEmail');
    if (storedEmail) {
      setGuestEmail(storedEmail);
    }
    
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching booking with ID:", id);
        
        if (!id) {
          setError('Invalid booking ID');
          return;
        }
        
        // Use .maybeSingle() to avoid errors when no data is found
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            venue_id,
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
            customer_phone,
            customer_name
          `)
          .eq('id', id)
          .maybeSingle();
        
        if (bookingError) {
          console.error('Error fetching booking details:', bookingError);
          setError('Unable to load booking details. Please try again later.');
          return;
        }
        
        if (!bookingData) {
          console.error('No booking found with ID:', id);
          setError('Unable to load booking details. This booking may not exist or has been removed.');
          return;
        }
        
        console.log("Booking data loaded:", bookingData);
        setBooking(bookingData);
        
        // Fetch venue details if venue_id exists
        if (bookingData.venue_id) {
          const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('id', bookingData.venue_id)
            .maybeSingle();
            
          if (venueError) {
            console.error('Error fetching venue details:', venueError);
          } else if (venueData) {
            console.log("Venue data loaded:", venueData);
            setVenue(venueData);
          }
        }
        
        // Check for invites
        await checkForInvites(storedEmail || '');
      } catch (err) {
        console.error('Exception in fetching booking:', err);
        setError('An unexpected error occurred while loading booking details');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  const checkForInvites = async (emailToCheck: string) => {
    if (!id) return;
    
    try {
      // Fetch all invites for this booking
      const { data: inviteData, error: inviteError } = await supabase
        .from('booking_invites')
        .select('email, name, status')
        .eq('booking_id', id);
        
      if (inviteError) {
        console.error('Error fetching invites:', inviteError);
        return;
      }
      
      if (!inviteData || inviteData.length === 0) {
        console.log("No invites found for this booking");
        setError('No invitations found for this booking');
        return;
      }
      
      console.log("Found invites:", inviteData);
      
      // If we have a stored email, try to match it with an invite
      if (emailToCheck) {
        const matchingInvite = inviteData.find(invite => 
          invite.email.toLowerCase() === emailToCheck.toLowerCase()
        );
        
        if (matchingInvite) {
          console.log("Found matching invite:", matchingInvite);
          setInviteInfo(matchingInvite);
          return;
        }
      }
      
      // If we have only one invite, use it
      if (inviteData.length === 1) {
        console.log("Only one invite found, using it:", inviteData[0]);
        setInviteInfo(inviteData[0]);
        localStorage.setItem('guestEmail', inviteData[0].email);
        setGuestEmail(inviteData[0].email);
      } else {
        // Multiple invites found, need to ask which one they are
        console.log("Multiple invites found, need to identify user");
        setNeedsEmailConfirmation(true);
      }
    } catch (err) {
      console.error('Error checking for invites:', err);
      setError('An error occurred while retrieving invitation information');
    }
  };

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
  
  const handleIdentifyByEmail = async () => {
    if (!guestEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to find your invitation.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    await checkForInvites(guestEmail);
    setSubmitting(false);
    
    if (!inviteInfo) {
      toast({
        title: "Invitation not found",
        description: "No invitation was found with this email address.",
        variant: "destructive"
      });
    } else {
      setNeedsEmailConfirmation(false);
      localStorage.setItem('guestEmail', guestEmail);
    }
  };

  // Function to send notification email
  const sendInvitationResponseEmail = async (status: 'accepted' | 'declined') => {
    if (!booking || !inviteInfo?.email) return;
    
    try {
      // Prepare the data for the notification email
      const notificationData = {
        hostEmail: booking.customer_email,
        hostName: booking.customer_name,
        guestEmail: inviteInfo.email,
        guestName: inviteInfo.name,
        venueName: booking.venue_name,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        status: status,
        bookingId: booking.id,
        venueId: booking.venue_id
      };
      
      // Call the edge function to send the notification email
      const response = await fetch('https://esdmelfzeszjtbnoajig.functions.supabase.co/send-invitation-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error sending notification email:', errorData);
        // Don't display an error to the user, just log it
      } else {
        console.log('Notification email sent successfully');
      }
    } catch (err) {
      console.error('Exception sending notification email:', err);
      // Don't display an error to the user, just log it
    }
  };

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      
      if (!inviteInfo?.email || !id) {
        toast({ 
          title: "Cannot identify invitation", 
          description: "Unable to process your response at this time.",
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }
      
      // Update the booking invite status in the database
      const { error } = await supabase
        .from('booking_invites')
        .update({ status: 'accepted' })
        .eq('booking_id', id)
        .eq('email', inviteInfo.email);
        
      if (error) {
        console.error('Error updating invite status:', error);
        toast({ 
          title: "Failed to accept invitation", 
          description: "There was an error processing your response.",
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }
      
      // Send notification email
      await sendInvitationResponseEmail('accepted');
      
      toast({ 
        title: "Accepted invitation", 
        description: "The host has been notified of your attendance."
      });
      
      // Update local state to reflect change
      setInviteInfo({...inviteInfo, status: 'accepted'});
      setSubmitting(false);
    } catch (err) {
      console.error('Exception in accepting invitation:', err);
      toast({ 
        title: "An error occurred", 
        description: "Please try again later.",
        variant: "destructive" 
      });
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setSubmitting(true);
      
      if (!inviteInfo?.email || !id) {
        toast({ 
          title: "Cannot identify invitation", 
          description: "Unable to process your response at this time.",
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }
      
      // Update the booking invite status in the database
      const { error } = await supabase
        .from('booking_invites')
        .update({ status: 'declined' })
        .eq('booking_id', id)
        .eq('email', inviteInfo.email);
        
      if (error) {
        console.error('Error updating invite status:', error);
        toast({ 
          title: "Failed to decline invitation", 
          description: "There was an error processing your response.",
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }
      
      // Send notification email
      await sendInvitationResponseEmail('declined');
      
      toast({ 
        title: "Declined invitation", 
        description: "The host has been notified that you can't attend."
      });
      
      // Update local state to reflect change
      setInviteInfo({...inviteInfo, status: 'declined'});
      setSubmitting(false);
    } catch (err) {
      console.error('Exception in declining invitation:', err);
      toast({ 
        title: "An error occurred", 
        description: "Please try again later.",
        variant: "destructive" 
      });
      setSubmitting(false);
    }
  };

  const getInviteStatus = () => {
    if (!inviteInfo || !inviteInfo.status || inviteInfo.status === 'pending') return null;
    
    switch (inviteInfo.status) {
      case 'accepted':
        return (
          <div className="mt-4 p-3 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-teal-500" />
            <p className="text-teal-300">You've accepted this invitation</p>
          </div>
        );
      case 'declined':
        return (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            <p className="text-red-300">You've declined this invitation</p>
          </div>
        );
      default:
        return null;
    }
  };
  
  // Render the email confirmation form
  if (needsEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-xl text-teal-400">Identify Your Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 mb-4">
              Multiple invitations were found for this event. Please enter your email address to identify your invitation.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Your Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleIdentifyByEmail}
              disabled={submitting || !guestEmail}
              className="bg-teal-500 hover:bg-teal-600 text-slate-900 w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Find My Invitation'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
            {inviteInfo && (
              <div className="text-sm text-teal-400/80 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>Invitation for: {inviteInfo.email}</span>
                {inviteInfo.name && <span>({inviteInfo.name})</span>}
              </div>
            )}
          </div>

          <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-medium mb-2 text-teal-400">Event Details:</h3>
            
            {booking.customer_name && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-teal-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Host</p>
                  <p className="text-white">{booking.customer_name}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-teal-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-300">Venue</p>
                {venue && booking.venue_id ? (
                  <Link to={`/venue/${booking.venue_id}`} className="text-teal-400 hover:underline">
                    {booking.venue_name}
                  </Link>
                ) : (
                  <p className="text-white">{booking.venue_name}</p>
                )}
              </div>
            </div>
            
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
            
            {booking.customer_email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-teal-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Contact Email</p>
                  <p className="text-white">{booking.customer_email}</p>
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
          
          {getInviteStatus()}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-slate-800 pt-4">
          {(!inviteInfo || !inviteInfo.status || inviteInfo.status === 'pending') && (
            <div className="grid grid-cols-2 w-full gap-3">
              <Button 
                className="bg-teal-500 hover:bg-teal-600 text-slate-900 flex items-center gap-2"
                onClick={handleAccept}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept
              </Button>
              <Button 
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                onClick={handleDecline}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Decline
              </Button>
            </div>
          )}

          {venue && booking.venue_id && (
            <Link to={`/venue/${booking.venue_id}`} className="w-full mt-3">
              <Button 
                variant="secondary" 
                className="w-full bg-slate-800 hover:bg-slate-700"
              >
                View Venue Details
              </Button>
            </Link>
          )}
          
          <p className="text-xs text-center text-slate-500 mt-4">
            This invitation was sent via FindVenue
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BookingInvite;
