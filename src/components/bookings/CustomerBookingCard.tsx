
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Eye, FileText, UserPlus, CalendarPlus, MapPin, CreditCard, User } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { InviteGuestsModal } from "./InviteGuestsModal";
import { AddToCalendarModal } from "./AddToCalendarModal";
import { supabase } from "@/integrations/supabase/client";
import { useVenueData } from "@/hooks/useVenueData";

interface CustomerBookingCardProps {
  booking: {
    id: string;
    venue_id: string;
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    total_price: number;
    guests: number;
    address?: string;
  };
}

export const CustomerBookingCard = ({ booking }: CustomerBookingCardProps) => {
  const navigate = useNavigate();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return "bg-green-500/10 text-green-500 border-green-500";
      case 'cancelled':
        return "bg-red-500/10 text-red-500 border-red-500";
      case 'pending':
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500";
    }
  };
  
  const handleViewDetails = () => {
    navigate(`/venue/${booking.venue_id}`, { replace: false });
  };
  
  const downloadBookingConfirmation = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Fetch additional venue details if needed
      let venueDetails = null;
      let pricePerPerson = 0;
      
      try {
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('address, price_per_person, city_name')
          .eq('id', booking.venue_id)
          .maybeSingle();
          
        if (!venueError && venueData) {
          venueDetails = venueData;
          pricePerPerson = venueData.price_per_person || 0;
        }
      } catch (error) {
        console.error("Error fetching venue details:", error);
      }
      
      // Create PDF document with modern styling
      const doc = new jsPDF();
      
      // Add Avnu logo image or text header
      doc.setFontSize(30);
      doc.setTextColor(41, 128, 185); // Avnu brand blue
      doc.text("Avnu", 105, 30, { align: 'center' });
      
      // Add confirmation title
      doc.setFontSize(22);
      doc.setTextColor(50, 50, 50);
      doc.text("Booking Confirmation", 105, 50, { align: 'center' });
      
      // Add horizontal divider line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, 60, 190, 60);
      
      // Status section with color
      const statusColors: Record<string, [number, number, number]> = {
        'confirmed': [46, 204, 113],
        'pending': [241, 196, 15],
        'cancelled': [231, 76, 60],
        'default': [52, 152, 219]
      };
      
      const statusColor = statusColors[booking.status.toLowerCase()] || statusColors['default'];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFontSize(18);
      doc.text(`Status: ${booking.status.toUpperCase()}`, 20, 75);
      
      // Reset text color for regular content
      doc.setTextColor(50, 50, 50);
      
      // Booking details section
      const startY = 90;
      let currentY = startY;
      const leftColumnX = 20;
      const rightColumnX = 95;
      const lineHeight = 10;
      
      // Helper function for adding labeled info
      const addLabeledInfo = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(label, x, y);
        
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text(value || 'N/A', x, y + 7);
        
        return y + 20; // Return next Y position
      };
      
      // Left column details
      currentY = addLabeledInfo("VENUE", booking.venue_name, leftColumnX, currentY);
      currentY = addLabeledInfo("DATE", format(new Date(booking.booking_date), "MMMM d, yyyy"), leftColumnX, currentY);
      currentY = addLabeledInfo("TIME", `${booking.start_time} - ${booking.end_time}`, leftColumnX, currentY);
      currentY = addLabeledInfo("NUMBER OF GUESTS", booking.guests.toString(), leftColumnX, currentY);
      
      // Reset for right column
      currentY = startY;
      
      // Right column details
      const address = venueDetails?.address || booking.address || 'Address not available';
      const cityName = venueDetails?.city_name || '';
      const fullAddress = cityName ? `${address}, ${cityName}` : address;
      
      currentY = addLabeledInfo("ADDRESS", fullAddress, rightColumnX, currentY);
      if (pricePerPerson > 0) {
        currentY = addLabeledInfo("PRICE PER PERSON", `SAR ${pricePerPerson.toLocaleString()}`, rightColumnX, currentY);
      }
      currentY = addLabeledInfo("BOOKING ID", booking.id, rightColumnX, currentY);
      
      // Add divider before pricing section
      const priceSectionY = Math.max(currentY + 15, 180);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, priceSectionY - 10, 190, priceSectionY - 10);
      
      // Total price section with larger font
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("TOTAL PRICE", leftColumnX, priceSectionY);
      
      doc.setFontSize(16);
      doc.setTextColor(41, 128, 185); // Avnu brand blue
      doc.setFont("helvetica", "bold");
      doc.text(`SAR ${booking.total_price.toLocaleString()}`, 190, priceSectionY, { align: 'right' });
      
      // If there's price per person, show the calculation
      if (booking.guests > 1 && pricePerPerson > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(`(${booking.guests} guests × SAR ${pricePerPerson.toLocaleString()})`, 190, priceSectionY + 7, { align: 'right' });
      }
      
      // Add special notes section if applicable
      if (booking.status === 'confirmed') {
        const notesY = priceSectionY + 25;
        doc.setDrawColor(240, 240, 240);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(20, notesY, 170, 30, 3, 3, 'FD');
        
        doc.setFontSize(11);
        doc.setTextColor(70, 70, 70);
        doc.setFont("helvetica", "bold");
        doc.text("IMPORTANT INFORMATION", leftColumnX + 5, notesY + 10);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Please arrive 15 minutes before your booking time. Don't forget to bring your booking confirmation.", leftColumnX + 5, notesY + 20);
      }
      
      // Add footer
      const footerY = 270;
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.text("Thank you for choosing Avnu!", 105, footerY, { align: 'center' });
      doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy, HH:mm")}`, 105, footerY + 5, { align: 'center' });
      doc.text(`Confirmation ID: ${booking.id}`, 105, footerY + 10, { align: 'center' });
      
      // Add QR code placeholder (you could implement actual QR code generation)
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(85, 200, 40, 40, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("QR CODE", 105, 220, { align: 'center' });
      
      // Save PDF with a well-formatted name
      const filename = `Avnu_Booking_${booking.venue_name.replace(/\s+/g, '_')}_${format(new Date(booking.booking_date), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const openInviteModal = () => {
    console.log("Opening invite modal for booking:", booking.id);
    setIsInviteModalOpen(true);
  };
  
  const openCalendarModal = () => {
    console.log("Opening calendar modal for booking:", booking.id);
    setIsCalendarModalOpen(true);
  };
  
  return (
    <>
      <Card className="glass-card border-white/10 overflow-hidden hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-2 bg-gradient-to-r from-findvenue-surface/20 to-transparent">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold">{booking.venue_name}</h3>
            <Badge variant="outline" className={`${getStatusColor(booking.status)}`}>
              {booking.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-findvenue" />
              <span>{format(new Date(booking.booking_date), "MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-findvenue" />
              <span>{booking.start_time} - {booking.end_time}</span>
            </div>
            {booking.guests > 0 && (
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-findvenue" />
                <span>{booking.guests} guests</span>
              </div>
            )}
            {booking.address && (
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-findvenue" />
                <span className="truncate">{booking.address}</span>
              </div>
            )}
            <div className="mt-2">
              <p className="text-right font-semibold text-findvenue">SAR {booking.total_price.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2 border-t border-white/10 gap-2 flex flex-wrap">
          {booking.status === 'confirmed' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 min-w-[45%] border-findvenue text-findvenue hover:bg-findvenue/5 hover:border-findvenue/80"
                onClick={openInviteModal}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Guests
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 min-w-[45%] border-findvenue text-findvenue hover:bg-findvenue/5 hover:border-findvenue/80"
                onClick={openCalendarModal}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to Calendar
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 min-w-[45%] border-findvenue text-findvenue hover:bg-findvenue/5 hover:border-findvenue/80"
            onClick={downloadBookingConfirmation}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-findvenue border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 min-w-[45%] border-findvenue text-findvenue hover:bg-findvenue/5 hover:border-findvenue/80"
            onClick={handleViewDetails}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Venue
          </Button>
        </CardFooter>
      </Card>

      {/* These modals need to be rendered conditionally based on their open state */}
      {isInviteModalOpen && (
        <InviteGuestsModal 
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          booking={booking}
        />
      )}

      {isCalendarModalOpen && (
        <AddToCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          booking={booking}
        />
      )}
    </>
  );
};
