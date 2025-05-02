
import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  Calendar, 
  CalendarPlus,
  Mail,
  Phone,
  CreditCard
} from "lucide-react";
import { format } from 'date-fns';
import { AddToCalendarModal } from '../bookings/AddToCalendarModal';

interface BookingTableProps {
  bookings: any[];
  activeTab: 'upcoming' | 'past';
  processingBookingIds: Set<string>;
  isBusy: boolean;
  handleStatusUpdate: (bookingId: string, status: 'confirmed' | 'cancelled') => void;
  initiateChat: (userId: string) => void;
}

export const CustomerBookingsTable = ({ 
  bookings, 
  activeTab, 
  processingBookingIds, 
  isBusy,
  handleStatusUpdate,
  initiateChat
}: BookingTableProps) => {
  
  const [calendarBooking, setCalendarBooking] = useState<any>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

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
  
  const getBookingGroups = () => {
    const groups: Record<string, any[]> = {};
    
    bookings.forEach(booking => {
      const key = `${booking.booking_date}-${booking.venue_id}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(booking);
    });
    
    return groups;
  };
  
  const bookingGroups = getBookingGroups();
  
  const handleOpenCalendar = (booking: any) => {
    setCalendarBooking(booking);
    setIsCalendarModalOpen(true);
  };
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead>Customer</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.keys(bookingGroups).length > 0 ? (
            Object.keys(bookingGroups).map(groupKey => {
              const group = bookingGroups[groupKey];
              const hasMultipleBookings = group.length > 1;
              
              return group.map((booking, idx) => (
                <TableRow key={booking.id} className={`border-white/10 ${hasMultipleBookings ? 'bg-findvenue-surface/20' : ''}`}>
                  <TableCell className="font-medium">{booking.user_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {booking.user_email && (
                        <div className="flex items-center gap-1 text-findvenue-text-muted">
                          <Mail className="h-3 w-3" />
                          <span>{booking.user_email}</span>
                        </div>
                      )}
                      {booking.customer_phone && (
                        <div className="flex items-center gap-1 text-findvenue-text-muted">
                          <Phone className="h-3 w-3" />
                          <span>{booking.customer_phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{booking.venue_name || 'Unnamed Venue'}</TableCell>
                  <TableCell>{formatBookingDate(booking.booking_date)}</TableCell>
                  <TableCell>{booking.start_time} - {booking.end_time}</TableCell>
                  <TableCell>{booking.guests}</TableCell>
                  <TableCell>
                    {booking.payment_method ? (
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        <span className="text-xs bg-findvenue/10 text-findvenue px-2 py-1 rounded">
                          {booking.payment_method}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-findvenue-text-muted">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>SAR {booking.total_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {booking.status === 'pending' && activeTab === 'upcoming' && (
                      <div className="flex space-x-2 justify-end">
                        <Button 
                          variant="outline"
                          className="border-green-500 text-green-500 hover:bg-green-500/10"
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                          disabled={processingBookingIds.has(booking.id) || isBusy}
                        >
                          {processingBookingIds.has(booking.id) ? (
                            <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full mr-1"></div>
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Confirm
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          disabled={processingBookingIds.has(booking.id) || isBusy}
                        >
                          {processingBookingIds.has(booking.id) ? (
                            <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full mr-1"></div>
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Cancel
                        </Button>
                      </div>
                    )}
                    {!processingBookingIds.has(booking.id) && booking.status !== 'pending' && (
                      <div className="flex space-x-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-findvenue text-findvenue hover:bg-findvenue/10"
                          onClick={() => initiateChat(booking.user_id)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                        
                        {booking.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-findvenue text-findvenue hover:bg-findvenue/10"
                            onClick={() => handleOpenCalendar(booking)}
                          >
                            <CalendarPlus className="h-4 w-4 mr-1" />
                            Calendar
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ));
            })
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-4 text-findvenue-text-muted">
                No bookings found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {calendarBooking && (
        <AddToCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          booking={calendarBooking}
        />
      )}
    </>
  );
};
