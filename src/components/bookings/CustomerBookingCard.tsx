
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Eye, Download, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BookingCalendar from "@/components/venue/BookingCalendar";

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

  const handleDownloadConfirmation = () => {
    // Create a simple text content for the booking confirmation
    const confirmationContent = `
Booking Confirmation
-------------------
Venue: ${booking.venue_name}
Date: ${format(new Date(booking.booking_date), "MMMM d, yyyy")}
Time: ${booking.start_time} - ${booking.end_time}
Guests: ${booking.guests}
Status: ${booking.status.toUpperCase()}
Total Price: SAR ${booking.total_price.toLocaleString()}
${booking.address ? `Address: ${booking.address}` : ''}
    `;

    // Create a Blob with the content
    const blob = new Blob([confirmationContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-confirmation-${booking.id}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
              <MapPin className="h-4 w-4 mr-2 text-findvenue-text-muted" />
              <span className="truncate">{booking.address}</span>
            </div>
          )}
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 mr-2 text-findvenue-text-muted" />
            <span>{booking.guests} guests</span>
          </div>
          <div className="mt-2">
            <p className="text-right font-semibold">SAR {booking.total_price.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t border-white/10 flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
            onClick={handleViewDetails}
          >
            <Eye className="mr-1 h-4 w-4" />
            View Venue Details
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="border-findvenue/30 text-findvenue hover:bg-findvenue/5"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Venue Availability Calendar</DialogTitle>
              </DialogHeader>
              <BookingCalendar
                selectedDate={new Date(booking.booking_date)}
                onDateSelect={() => {}}
                bookedDates={[]}
                fullyBookedDates={[]}
                dayBookedDates={[]}
                hourlyBookedDates={[]}
                bookingType="full-day"
              />
            </DialogContent>
          </Dialog>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-findvenue/30 text-findvenue hover:bg-findvenue/5"
          onClick={handleDownloadConfirmation}
        >
          <Download className="mr-1 h-4 w-4" />
          Download Confirmation
        </Button>
      </CardFooter>
    </Card>
  );
};

