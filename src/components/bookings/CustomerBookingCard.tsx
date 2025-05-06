import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Eye, FileText, UserPlus, CalendarPlus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { InviteGuestsModal } from "./InviteGuestsModal";
import { AddToCalendarModal } from "./AddToCalendarModal";
import { supabase } from "@/integrations/supabase/client";

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
      
      // Set background color for the entire page
      doc.setFillColor(16, 24, 39); // Dark blue background
      doc.rect(0, 0, 210, 297, 'F');
      
      // Add decorative elements - blurred circles in brand colors
      const addBlurredCircle = (x: number, y: number, radius: number, color: [number, number, number], alpha: number) => {
        for (let i = radius; i > 0; i -= 1) {
          doc.setFillColor(color[0], color[1], color[2]);
          doc.setFillOpacity(alpha * (i / radius));
          doc.circle(x, y, i, 'F');
        }
        doc.setFillOpacity(1);
      };
      
      // Add decorative blurred circles
      addBlurredCircle(30, 30, 60, [16, 185, 129], 0.3); // Avnu green
      addBlurredCircle(170, 240, 80, [41, 128, 185], 0.2); // Avnu blue
      
      // Add semi-transparent overlay to enhance text readability
      doc.setFillColor(16, 24, 39);
      doc.setFillOpacity(0.85);
      doc.rect(15, 15, 180, 267, 'F');
      doc.setFillOpacity(1);
      
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
      
      // If there's price per person, show the calculation
      if (booking.guests > 1 && pricePerPerson > 0) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text(`(${booking.guests} guests × SAR ${pricePerPerson.toLocaleString()})`, 175, priceSectionY + 18, { align: 'right' });
      }
      
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
