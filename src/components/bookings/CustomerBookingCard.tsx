import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Eye, FileText, UserPlus, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { InviteGuestsModal } from "./InviteGuestsModal";
import { AddToCalendarModal } from "./AddToCalendarModal";

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
  
  const downloadBookingConfirmation = () => {
    // Create PDF document
    const doc = new jsPDF();
    
    // Set PDF properties
    doc.setProperties({
      title: `Booking Confirmation - ${booking.id}`,
      subject: `Booking for ${booking.venue_name}`,
      creator: 'Avnu App',
    });
    
    // Add logo or header (placeholder text for now)
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Use brand color
    doc.text("Avnu", 105, 20, { align: 'center' });
    
    // Add confirmation title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Booking Confirmation", 105, 35, { align: 'center' });
    
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 40, 190, 40);
    
    // Add booking details
    doc.setFontSize(12);
    
    // Status indicator with color
    doc.setFontSize(14);
    const statusColors: Record<string, [number, number, number]> = {
      'confirmed': [39, 174, 96],
      'pending': [241, 196, 15],
      'cancelled': [231, 76, 60],
      'default': [52, 152, 219]
    };
    
    const statusColor = statusColors[booking.status] || statusColors['default'];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Status: ${booking.status.toUpperCase()}`, 20, 55);
    
    // Reset text color for regular content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    // Booking details
    let y = 70;
    const leftMargin = 20;
    const lineHeight = 10;
    
    const addLabelValuePair = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, leftMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, leftMargin + 40, y);
      y += lineHeight;
    };
    
    addLabelValuePair("Venue", booking.venue_name);
    addLabelValuePair("Date", format(new Date(booking.booking_date), "MMMM d, yyyy"));
    addLabelValuePair("Time", `${booking.start_time} - ${booking.end_time}`);
    addLabelValuePair("Guests", booking.guests.toString());
    
    if (booking.address) {
      addLabelValuePair("Address", booking.address);
    }
    
    // Add price with currency
    y += lineHeight;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total Price:", leftMargin, y);
    doc.text(`SAR ${booking.total_price.toLocaleString()}`, 190, y, { align: 'right' });
    
    // Add footer
    const footerY = 270;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for choosing Avnu!", 105, footerY, { align: 'center' });
    doc.text(`Confirmation ID: ${booking.id}`, 105, footerY + 7, { align: 'center' });
    doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy, HH:mm")}`, 105, footerY + 14, { align: 'center' });
    
    // Save PDF
    doc.save(`booking-confirmation-${booking.id}.pdf`);
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
          >
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
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
