import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return "bg-green-500/10 text-green-500";
      case 'cancelled':
        return "bg-red-500/10 text-red-500";
      case 'pending':
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-blue-500/10 text-blue-500";
    }
  };

  const handleViewDetails = () => {
    navigate(`/venue/${booking.venue_id}`, { replace: false });
  };
  
  const downloadBookingConfirmation = () => {
    // Create booking confirmation text
    const bookingDetails = `
Booking Confirmation
-------------------
Venue: ${booking.venue_name}
Date: ${format(new Date(booking.booking_date), "MMMM d, yyyy")}
Time: ${booking.start_time} - ${booking.end_time}
Number of Guests: ${booking.guests}
Status: ${booking.status.toUpperCase()}
Total Price: SAR ${booking.total_price.toLocaleString()}
${booking.address ? `\nAddress: ${booking.address}` : ''}
    `.trim();

    // Create and download file
    const blob = new Blob([bookingDetails], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-confirmation-${booking.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  
  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">{booking.venue_name}</h3>
          <Badge variant="outline" className={getStatusColor(booking.status)}>
            {booking.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-findvenue-text-muted" />
            <span>{format(new Date(booking.booking_date), "MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-findvenue-text-muted" />
            <span>{booking.start_time} - {booking.end_time}</span>
          </div>
          {booking.address && (
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-findvenue-text-muted" />
              <span>{booking.guests} guests</span>
            </div>
          )}
          <div className="mt-2">
            <p className="text-right font-semibold">SAR {booking.total_price.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t border-white/10 gap-2 flex-col">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
          onClick={downloadBookingConfirmation}
        >
          <FileText className="mr-2 h-4 w-4" />
          Download Confirmation
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
          onClick={handleViewDetails}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Venue Details
        </Button>
      </CardFooter>
    </Card>
  );
};
