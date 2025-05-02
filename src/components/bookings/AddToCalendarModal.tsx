
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  CalendarPlus, 
  Calendar as CalendarIcon, 
  Mail as MailIcon, 
  ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

  const generateGoogleCalendarUrl = () => {
    // Format the date and times for Google Calendar
    const bookingDate = new Date(booking.booking_date);
    
    // Parse start time
    const [startHour, startMinute] = booking.start_time.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHour, startMinute, 0);
    
    // Parse end time
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);
    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHour, endMinute, 0);
    
    // Format dates for Google Calendar
    const startDateStr = startDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    const endDateStr = endDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Create event details
    const eventTitle = encodeURIComponent(`FindVenue: ${booking.venue_name}`);
    const eventDetails = encodeURIComponent(`Booking Reference: ${booking.id}`);
    const eventLocation = encodeURIComponent(booking.address || booking.venue_name);
    
    // Construct Google Calendar URL
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDateStr}/${endDateStr}&details=${eventDetails}&location=${eventLocation}`;
  };
  
  const generateAppleCalendarFile = () => {
    // Parse booking date and times
    const bookingDate = new Date(booking.booking_date);
    
    // Parse start time
    const [startHour, startMinute] = booking.start_time.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHour, startMinute, 0);
    
    // Parse end time
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);
    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHour, endMinute, 0);
    
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

  const formattedDate = format(new Date(booking.booking_date), 'MMMM d, yyyy');
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CalendarPlus className="h-6 w-6 text-findvenue mr-2" />
              Add to Calendar
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-6 text-center">
            <h3 className="font-medium">{booking.venue_name}</h3>
            <p className="text-sm text-findvenue-text-muted">{formattedDate}</p>
            <p className="text-sm text-findvenue-text-muted">{booking.start_time} - {booking.end_time}</p>
          </div>
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={openInGoogleCalendar}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>Open in Google Calendar</span>
              <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={generateAppleCalendarFile}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>Download for Apple Calendar (.ics)</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={copyCalendarLink}
            >
              <MailIcon className="h-4 w-4 mr-2" />
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
