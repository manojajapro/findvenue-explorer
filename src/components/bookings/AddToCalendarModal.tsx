
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  CalendarPlus, 
  Calendar, 
  ExternalLink,
  Copy,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    address?: string;
  };
}

export const AddToCalendarModal = ({ isOpen, onClose, booking }: AddToCalendarModalProps) => {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  // Helper function to parse dates from booking data
  const parseBookingDates = () => {
    const bookingDate = new Date(booking.booking_date);
    
    // Parse start time
    const [startHour, startMinute] = booking.start_time.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHour, startMinute, 0);
    
    // Parse end time
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);
    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHour, endMinute, 0);
    
    return { startDateTime, endDateTime };
  };

  const generateGoogleCalendarUrl = () => {
    const { startDateTime, endDateTime } = parseBookingDates();
    
    // Format dates for Google Calendar
    const startDateStr = startDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    const endDateStr = endDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Create event details
    const eventTitle = encodeURIComponent(`Venue: ${booking.venue_name}`);
    const eventDetails = encodeURIComponent(`Booking Reference: ${booking.id}`);
    const eventLocation = encodeURIComponent(booking.address || booking.venue_name);
    
    // Construct Google Calendar URL
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDateStr}/${endDateStr}&details=${eventDetails}&location=${eventLocation}`;
  };
  
  const generateAppleCalendarFile = () => {
    const { startDateTime, endDateTime } = parseBookingDates();
    
    // Format dates for iCal format (YYYYMMDDTHHMMSSZ)
    const formatDateForIcal = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const startDateStr = formatDateForIcal(startDateTime);
    const endDateStr = formatDateForIcal(endDateTime);
    const createdDateStr = formatDateForIcal(new Date());
    
    // Create iCal content
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FindVenue//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${startDateStr}`,
      `DTEND:${endDateStr}`,
      `DTSTAMP:${createdDateStr}`,
      `UID:${booking.id}@findvenue.app`,
      `SUMMARY:FindVenue: ${booking.venue_name}`,
      `DESCRIPTION:Booking Reference: ${booking.id}`,
      `LOCATION:${booking.address || booking.venue_name}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create a Blob with the iCal content
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    
    // Create a downloadable link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FindVenue_Booking_${booking.id}.ics`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Calendar File Downloaded",
      description: "The .ics file has been downloaded. Open it to add to your calendar app.",
    });
  };
  
  const copyCalendarLink = () => {
    const googleCalendarUrl = generateGoogleCalendarUrl();
    
    navigator.clipboard.writeText(googleCalendarUrl).then(() => {
      toast({
        title: "Link Copied!",
        description: "Calendar link has been copied to clipboard.",
      });
    }).catch(err => {
      console.error('Failed to copy link:', err);
      toast({
        title: "Failed to copy link",
        description: "Please try again or use the open link option.",
        variant: "destructive",
      });
    });
  };
  
  const openInGoogleCalendar = () => {
    const googleCalendarUrl = generateGoogleCalendarUrl();
    window.open(googleCalendarUrl, '_blank');
  };

  // New function for one-click Google Calendar add
  const addToGoogleCalendarDirectly = async () => {
    setIsAdding(true);
    try {
      // Get the Google Calendar URL
      const googleCalendarUrl = generateGoogleCalendarUrl();
      
      // Open in a new tab
      window.open(googleCalendarUrl, '_blank');
      
      toast({
        title: "Adding to Google Calendar",
        description: "Your event is being added to Google Calendar.",
      });
    } catch (error) {
      console.error('Error adding to Google Calendar:', error);
      toast({
        title: "Failed to add to Google Calendar",
        description: "Please try again or use another method.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const formattedDate = format(new Date(booking.booking_date), 'MMMM d, yyyy');
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md glass-card border-white/10 bg-gradient-to-b from-findvenue-surface/5 to-transparent">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CalendarPlus className="h-6 w-6 text-findvenue mr-2" />
              Add to Calendar
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-6 text-center bg-findvenue/5 p-4 rounded-lg">
            <h3 className="font-medium text-lg text-findvenue">{booking.venue_name}</h3>
            <p className="text-sm text-findvenue-text-muted">{formattedDate}</p>
            <p className="text-sm text-findvenue-text-muted">{booking.start_time} - {booking.end_time}</p>
          </div>
          
          <div className="space-y-4">
            {/* New primary button for one-click Google Calendar add */}
            <Button 
              variant="default" 
              className="w-full flex items-center justify-center bg-[#4285F4] hover:bg-[#3367d6] text-white transition-all duration-300"
              onClick={addToGoogleCalendarDirectly}
              disabled={isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              <span>Add to Google Calendar with One Click</span>
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-findvenue/20"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">Other Options</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center border-findvenue text-findvenue hover:bg-findvenue/10 transition-all duration-300"
              onClick={openInGoogleCalendar}
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span>Open in Google Calendar</span>
              <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center border-findvenue text-findvenue hover:bg-findvenue/10 transition-all duration-300"
              onClick={generateAppleCalendarFile}
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span>Download for Apple Calendar (.ics)</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center border-findvenue text-findvenue hover:bg-findvenue/10 transition-all duration-300"
              onClick={copyCalendarLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              <span>Copy Calendar Link</span>
            </Button>
          </div>
          
          <p className="mt-6 text-xs text-center text-findvenue-text-muted">
            Calendar events will include all the details about your booking.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
