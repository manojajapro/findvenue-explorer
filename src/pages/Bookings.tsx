import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  Calendar, 
  CalendarPlus,
  Mail,
  Phone,
  CreditCard,
  UserPlus,
  FileText,
  Eye,
  Loader2,
  Trash2,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import BookingOwnerChat from '@/components/bookings/BookingOwnerChat';
import { enableRealtimeForTable } from '@/utils/supabaseRealtime';
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate';
import { jsPDF } from 'jspdf';
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
import { InviteGuestsModal } from '@/components/bookings/InviteGuestsModal';
import { AddToCalendarModal } from '@/components/bookings/AddToCalendarModal';
import { CustomerBookingCard } from '@/components/bookings/CustomerBookingCard';

type Booking = {
  id: string;
  user_id: string;
  venue_id: string;
  venue_name: string;
  venue_image?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at: string;
  guests: number;
  special_requests?: string;
  owner_id?: string;
  owner_name?: string;
  address?: string;
};

const Bookings = () => {
  const { user, isVenueOwner } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  useEffect(() => {
    if (user) {
      try {
        enableRealtimeForTable('bookings');
        enableRealtimeForTable('notifications');
      } catch (e) {
        console.log('Error enabling realtime:', e);
      }
    }
  }, [user]);
  
  useEffect(() => {
    if (user && retryCount < 3) {
      fetchBookings();
    } else if (!user) {
      setIsLoading(false);
      setBookings([]);
    }
  }, [user, retryCount]);
  
  const fetchBookings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setFetchError(null);
    
    try {
      console.log("Fetching bookings for user:", user.id, "isVenueOwner:", isVenueOwner);
      
      let query;
      
      if (isVenueOwner) {
        query = supabase
          .from('bookings')
          .select('*, venues:venue_id(name, gallery_images, owner_info)')
          .filter('venues.owner_info->user_id', 'eq', user.id);
      } else {
        query = supabase
          .from('bookings')
          .select('*, venues:venue_id(name, gallery_images, owner_info)')
          .eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log("Bookings data:", data);
      
      if (!data || data.length === 0) {
        setBookings([]);
        setIsLoading(false);
        return;
      }
      
      const formattedBookings: Booking[] = data.map((item: any) => {
        let ownerId = undefined;
        let ownerName = undefined;
        
        if (item.venues && item.venues.owner_info) {
          try {
            const ownerInfo = typeof item.venues.owner_info === 'string'
              ? JSON.parse(item.venues.owner_info)
              : item.venues.owner_info;
              
            ownerId = ownerInfo.user_id;
            ownerName = ownerInfo.name;
          } catch (e) {
            console.error("Error parsing owner_info", e);
          }
        }
        
        let venueImage = '';
        if (item.venues && item.venues.gallery_images) {
          if (Array.isArray(item.venues.gallery_images) && item.venues.gallery_images.length > 0) {
            venueImage = item.venues.gallery_images[0];
          } else if (typeof item.venues.gallery_images === 'string') {
            try {
              const images = JSON.parse(item.venues.gallery_images);
              venueImage = Array.isArray(images) && images.length > 0 ? images[0] : '';
            } catch (e) {
              console.error("Error parsing gallery_images", e);
            }
          }
        }
        
        let formattedDate = item.booking_date;
        
        return {
          id: item.id,
          user_id: item.user_id,
          venue_id: item.venue_id,
          venue_name: item.venues?.name || item.venue_name || 'Unnamed Venue',
          venue_image: venueImage,
          booking_date: formattedDate,
          start_time: item.start_time,
          end_time: item.end_time,
          status: item.status,
          total_price: item.total_price,
          created_at: item.created_at,
          guests: item.guests,
          special_requests: item.special_requests,
          owner_id: ownerId,
          owner_name: ownerName
        };
      });
      
      console.log("Formatted bookings:", formattedBookings);
      setBookings(formattedBookings);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setFetchError(error.message || 'Failed to load bookings.');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bookings.',
        variant: 'destructive',
      });
      
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };
  
  const { notifyVenueOwner } = useBookingStatusUpdate(() => fetchBookings());
  
  const cancelBooking = async (bookingId: string) => {
    try {
      setIsCancelling(true);
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');
      
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );

      if (booking.owner_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.owner_id,
            title: 'Booking Cancelled',
            message: `A booking for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')} has been cancelled by the customer.`,
            type: 'booking',
            read: false,
            link: '/customer-bookings',
            data: {
              booking_id: bookingId,
              venue_id: booking.venue_id
            }
          });
      }
      
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          title: 'Booking Cancelled',
          message: `You have cancelled your booking for "${booking.venue_name}" on ${format(new Date(booking.booking_date), 'MMM d, yyyy')}.`,
          type: 'booking',
          read: false,
          link: '/bookings',
          data: {
            booking_id: bookingId,
            venue_id: booking.venue_id
          }
        });
      
      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been cancelled successfully.',
      });
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const downloadBookingConfirmation = async (booking: Booking) => {
    try {
      // Create PDF document with modern styling
      const doc = new jsPDF();
      
      // Set background color for the entire page
      doc.setFillColor(16, 24, 39); // Dark blue background
      doc.rect(0, 0, 210, 297, 'F');
      
      // Add decorative elements - blurred circles in brand colors
      const addBlurredCircle = (x: number, y: number, radius: number, color: [number, number, number], alpha: number) => {
        for (let i = radius; i > 0; i -= 1) {
          doc.setFillColor(color[0], color[1], color[2]);
          doc.setGlobalAlpha(alpha * (i / radius));
          doc.circle(x, y, i, 'F');
        }
        doc.setGlobalAlpha(1);
      };
      
      // Add decorative blurred circles
      addBlurredCircle(30, 30, 60, [16, 185, 129], 0.3); // Avnu green
      addBlurredCircle(170, 240, 80, [41, 128, 185], 0.2); // Avnu blue
      
      // Add semi-transparent overlay to enhance text readability
      doc.setFillColor(16, 24, 39);
      doc.setGlobalAlpha(0.85);
      doc.rect(15, 15, 180, 267, 'F');
      doc.setGlobalAlpha(1);
      
      // Add decorative header bar
      doc.setFillColor(16, 185, 129); // Avnu green
      doc.rect(15, 15, 180, 8, 'F');
      
      // Add Avnu logo/text header
      doc.setFontSize(38);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("AVNU", 105, 40, { align: 'center' });
      
      // Add confirmation title
      doc.setFontSize(22);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 220);
      doc.text("Booking Confirmation", 105, 55, { align: 'center' });
      
      // Add modern divider
      doc.setDrawColor(16, 185, 129); // Avnu green
      doc.setLineWidth(0.5);
      doc.line(40, 65, 170, 65);
      
      // Status section with color
      const statusColors: Record<string, [number, number, number]> = {
        'confirmed': [16, 185, 129], // Avnu green
        'pending': [241, 196, 15],
        'cancelled': [231, 76, 60],
        'default': [41, 128, 185] // Avnu blue
      };
      
      const statusColor = statusColors[booking.status.toLowerCase()] || statusColors['default'];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(25, 75, 160, 15, 3, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`STATUS: ${booking.status.toUpperCase()}`, 105, 84, { align: 'center' });
      
      // Reset text color for regular content
      doc.setTextColor(220, 220, 220);
      doc.setFont("helvetica", "normal");
      
      // Booking details section
      const startY = 105;
      const leftColumnX = 25;
      const rightColumnX = 115;
      
      // Helper function for adding labeled info
      const addLabeledInfo = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(label, x, y);
        
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(value || 'N/A', x, y + 7);
        
        return y + 20; // Return next Y position
      };
      
      // Left column details
      let currentY = startY;
      currentY = addLabeledInfo("VENUE", booking.venue_name, leftColumnX, currentY);
      currentY = addLabeledInfo("DATE", format(new Date(booking.booking_date), "MMMM d, yyyy"), leftColumnX, currentY);
      currentY = addLabeledInfo("TIME", `${booking.start_time} - ${booking.end_time}`, leftColumnX, currentY);
      currentY = addLabeledInfo("NUMBER OF GUESTS", booking.guests.toString(), leftColumnX, currentY);
      
      // Reset for right column
      currentY = startY;
      
      // Right column details - Try to get address from booking or fetch it
      let address = booking.address || '';
      
      // Add address information
      currentY = addLabeledInfo("ADDRESS", address, rightColumnX, currentY);
      currentY = addLabeledInfo("BOOKING ID", booking.id, rightColumnX, currentY);
      
      // Add divider before pricing section
      const priceSectionY = Math.max(currentY + 15, 200);
      doc.setDrawColor(16, 185, 129); // Avnu green
      doc.setLineWidth(0.5);
      doc.line(25, priceSectionY - 10, 185, priceSectionY - 10);
      
      // Total price section with larger font and highlight box
      doc.setFillColor(30, 41, 59); // Darker blue for price box
      doc.roundedRect(25, priceSectionY - 5, 160, 25, 3, 3, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text("TOTAL PRICE", 35, priceSectionY + 8);
      
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129); // Avnu green
      doc.setFont("helvetica", "bold");
      doc.text(`SAR ${booking.total_price.toLocaleString()}`, 175, priceSectionY + 8, { align: 'right' });
      
      // Add special notes section if applicable
      if (booking.status === 'confirmed') {
        const notesY = priceSectionY + 35;
        doc.setFillColor(30, 41, 59); // Darker blue
        doc.roundedRect(25, notesY, 160, 30, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(220, 220, 220);
        doc.setFont("helvetica", "bold");
        doc.text("IMPORTANT INFORMATION", 35, notesY + 10);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Please arrive 15 minutes before your booking time.", 35, notesY + 20);
        doc.text("Don't forget to bring your booking confirmation.", 35, notesY + 28);
      }
      
      // Add QR code placeholder with modern styling
      doc.setFillColor(40, 50, 70);
      doc.roundedRect(80, 215, 50, 50, 2, 2, 'F');
      
      doc.setDrawColor(16, 185, 129); // Avnu green
      doc.setLineWidth(0.5);
      doc.roundedRect(85, 220, 40, 40, 1, 1, 'S');
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("SCAN QR CODE", 105, 240, { align: 'center' });
      doc.text("TO VERIFY BOOKING", 105, 246, { align: 'center' });
      
      // Add footer
      const footerY = 275;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for choosing Avnu!", 105, footerY, { align: 'center' });
      doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy, HH:mm")}`, 105, footerY + 5, { align: 'center' });
      doc.text(`Confirmation ID: ${booking.id}`, 105, footerY + 10, { align: 'center' });
      
      // Save PDF with a well-formatted name
      const filename = `Avnu_Booking_${booking.venue_name.replace(/\s+/g, '_')}_${format(new Date(booking.booking_date), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate booking confirmation.',
        variant: 'destructive',
      });
    }
  };

  const handleViewVenueDetails = (venueId: string) => {
    navigate(`/venue/${venueId}`, { replace: false });
  };

  const openInviteModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsInviteModalOpen(true);
  };

  const openCalendarModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCalendarModalOpen(true);
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
  
  const getGroupedBookings = () => {
    const groupedBookings: Record<string, Booking[]> = {};
    
    displayBookings.forEach(booking => {
      const key = `${booking.venue_id}-${booking.booking_date}`;
      if (!groupedBookings[key]) {
        groupedBookings[key] = [];
      }
      groupedBookings[key].push(booking);
    });
    
    return groupedBookings;
  };
  
  const bookingGroups = getGroupedBookings();
  
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
  
  const handleRetryFetch = () => {
    setIsLoading(true);
    setRetryCount(0);
    fetchBookings();
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-findvenue-text-muted mb-8">
              View and manage your venue bookings
            </p>
            
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-findvenue-text-muted mb-4">
                  Please log in to view your bookings
                </p>
                <Button className="bg-findvenue hover:bg-findvenue-dark" asChild>
                  <a href="/login">Login</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {isVenueOwner ? 'Venue Bookings' : 'My Bookings'}
          </h1>
          <p className="text-findvenue-text-muted mb-8">
            {isVenueOwner 
              ? 'Manage bookings for all your venues' 
              : 'View and manage your venue bookings'}
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
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-findvenue mx-auto"></div>
              <p className="mt-4 text-findvenue-text-muted">Loading bookings...</p>
            </div>
          ) : fetchError ? (
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-destructive mb-4">
                  {fetchError}
                </p>
                <Button onClick={handleRetryFetch} className="bg-findvenue hover:bg-findvenue-dark">
                  Retry Loading
                </Button>
              </CardContent>
            </Card>
          ) : displayBookings.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-findvenue-text-muted">
                  {activeTab === 'upcoming' 
                    ? "You don't have any upcoming bookings" 
                    : "You don't have any past bookings"}
                </p>
                {activeTab === 'upcoming' && (
                  <Button className="mt-4 bg-findvenue hover:bg-findvenue-dark" asChild>
                    <a href="/venues">Browse Venues</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(bookingGroups).map(([groupKey, groupBookings]) => {
                const isMultipleBookings = groupBookings.length > 1;
                const firstBooking = groupBookings[0];
                
                return (
                  <Card key={groupKey} className={`glass-card border-white/10 overflow-hidden ${isMultipleBookings ? 'border-l-4 border-l-findvenue' : ''}`}>
                    <div className="flex flex-col md:flex-row">
                      {firstBooking.venue_image && (
                        <div className="w-full md:w-1/4 h-48 md:h-auto">
                          <img 
                            src={firstBooking.venue_image} 
                            alt={firstBooking.venue_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className={`flex-1 p-6 ${!firstBooking.venue_image ? 'w-full' : 'w-3/4'}`}>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-bold">{firstBooking.venue_name}</h3>
                              <Badge className={`ml-2 ${getStatusColor(firstBooking.status)}`}>
                                {firstBooking.status.charAt(0).toUpperCase() + firstBooking.status.slice(1)}
                              </Badge>
                            </div>
                            
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center text-findvenue-text-muted">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>{formatBookingDate(firstBooking.booking_date)}</span>
                              </div>
                              
                              {isMultipleBookings ? (
                                <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-medium text-findvenue">Multiple bookings on this date:</p>
                                  {groupBookings.map((booking, idx) => (
                                    <div key={idx} className="flex items-center ml-6 text-findvenue-text-muted">
                                      <Clock className="h-4 w-4 mr-2" />
                                      <span>{booking.start_time} - {booking.end_time}</span>
                                      <span className="ml-2">({booking.guests} guests)</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center text-findvenue-text-muted">
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span>{firstBooking.start_time} - {firstBooking.end_time}</span>
                                  </div>
                                  <div className="flex items-center text-findvenue-text-muted">
                                    <Users className="h-4 w-4 mr-2" />
                                    <span>{firstBooking.guests} guests</span>
                                  </div>
                                </>
                              )}
                              
                              {firstBooking.special_requests && (
                                <div className="mt-4 p-3 bg-findvenue-surface/30 rounded-md border border-white/5 text-sm">
                                  <p className="font-medium mb-1">Special Requests:</p>
                                  <p className="text-findvenue-text-muted">{firstBooking.special_requests}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end justify-between h-full">
                            <div className="text-right">
                              <p className="text-findvenue-text-muted text-sm">Total Price</p>
                              <p className="text-xl font-bold">SAR {firstBooking.total_price.toLocaleString()}</p>
                            </div>
                            
                            <div className="mt-4 flex flex-col gap-2">
                              {firstBooking.owner_id && (
                                <BookingOwnerChat 
                                  ownerId={firstBooking.owner_id}
                                  ownerName={firstBooking.owner_name}
                                  venueId={firstBooking.venue_id}
                                  venueName={firstBooking.venue_name}
                                  bookingId={firstBooking.id}
                                />
                              )}

                              {firstBooking.status === 'confirmed' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
                                    onClick={() => openInviteModal(firstBooking)}
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Invite Guests
                                  </Button>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
                                    onClick={() => openCalendarModal(firstBooking)}
                                  >
                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                    Add to Calendar
                                  </Button>
                                </>
                              )}

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
                                onClick={() => downloadBookingConfirmation(firstBooking)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Download PDF
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
                                onClick={() => handleViewVenueDetails(firstBooking.venue_id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Venue Details
                              </Button>

                              {(firstBooking.status === 'pending' || firstBooking.status === 'confirmed') && activeTab === 'upcoming' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      className="w-full border-destructive text-destructive hover:bg-destructive/10"
                                      disabled={isCancelling}
                                    >
                                      {isCancelling ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                      )}
                                      Cancel Booking
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-findvenue-card-bg border-white/10">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to cancel this booking? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                      <AlertDialogAction 
                                        className="bg-destructive hover:bg-destructive/90 text-white"
                                        onClick={() => cancelBooking(firstBooking.id)}
                                      >
                                        Yes, Cancel
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Modals */}
          {selectedBooking && isCalendarModalOpen && (
            <AddToCalendarModal
              isOpen={isCalendarModalOpen}
              onClose={() => setIsCalendarModalOpen(false)}
              booking={selectedBooking}
            />
          )}

          {selectedBooking && isInviteModalOpen && (
            <InviteGuestsModal
              isOpen={isInviteModalOpen}
              onClose={() => setIsInviteModalOpen(false)}
              booking={selectedBooking}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookings;
