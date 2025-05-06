import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Eye, FileText, UserPlus, CalendarPlus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { InviteGuestsModal } from "./InviteGuestsModal";
import { AddToCalendarModal } from "./AddToCalendarModal";
import { supabase } from "@/integrations/supabase/client";
import { generateBookingConfirmationPDF } from "@/utils/pdfGenerator";

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
      let cityName = '';
      
      try {
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('address, price_per_person, city_name')
          .eq('id', booking.venue_id)
          .maybeSingle();
          
        if (!venueError && venueData) {
          venueDetails = venueData;
          pricePerPerson = venueData.price_per_person || 0;
          cityName = venueData.city_name || '';
        }
      } catch (error) {
        console.error("Error fetching venue details:", error);
      }
      
      // Use our utility function to generate the PDF
      await generateBookingConfirmationPDF({
        ...booking,
        address: booking.address || venueDetails?.address || 'Address not available',
        cityName: cityName,
        pricePerPerson: pricePerPerson
      });
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
