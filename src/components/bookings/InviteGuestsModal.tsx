import { useState, useEffect } from 'react';
import { X, Mail, Plus, Check, Loader2, XCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface InviteGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    venue_id: string;
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    address?: string;
    guests?: number;
    special_requests?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
  };
}

export const InviteGuestsModal = ({ isOpen, onClose, booking }: InviteGuestsModalProps) => {
  const { toast } = useToast();
  const [emails, setEmails] = useState<string[]>(['']);
  const [names, setNames] = useState<string[]>(['']);
  const [isSending, setIsSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Format date for display
  const formattedDate = format(new Date(booking.booking_date), 'MMMM d, yyyy');
  
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };
  
  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };
  
  const addEmailField = () => {
    setEmails([...emails, '']);
    setNames([...names, '']);
  };
  
  const removeEmailField = (index: number) => {
    const newEmails = [...emails];
    const newNames = [...names];
    newEmails.splice(index, 1);
    newNames.splice(index, 1);
    setEmails(newEmails);
    setNames(newNames);
  };
  
  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => email === '' || emailRegex.test(email));
  };

  const sendInvitations = async () => {
    // Clear any previous error messages
    setErrorMessage(null);
    
    // Filter out empty emails
    const validEmails = emails.filter((email, index) => email.trim() !== '');
    const validIndices = emails.map((email, index) => email.trim() !== '' ? index : -1).filter(idx => idx !== -1);
    const validNames = validIndices.map(idx => names[idx] || '');
    
    if (validEmails.length === 0) {
      toast({
        title: "No emails provided",
        description: "Please enter at least one email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!validateEmails()) {
      toast({
        title: "Invalid email(s)",
        description: "Please ensure all email addresses are valid.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      console.log("Sending invitations to:", validEmails);
      console.log("With names:", validNames);
      console.log("Booking ID:", booking.id);
      console.log("Venue ID:", booking.venue_id);
      
      // Get current origin for links
      const appOrigin = window.location.origin;
      
      // Array to track successful sends
      const successfulSends: string[] = [];
      const failedSends: {email: string, error: string}[] = [];
      
      // Send invitations via edge function
      for (let i = 0; i < validEmails.length; i++) {
        const trimmedEmail = validEmails[i].toLowerCase().trim();
        const recipientName = validNames[i].trim();
        
        console.log("Processing invite for email:", trimmedEmail, "name:", recipientName);
        
        // Determine the function URL based on environment
        const functionUrl = `${appOrigin.includes('localhost') 
          ? "http://localhost:54321" 
          : "https://esdmelfzeszjtbnoajig.supabase.co"}/functions/v1/send-booking-invite?appOrigin=${encodeURIComponent(appOrigin)}`;
        
        try {
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: trimmedEmail,
              recipientName: recipientName,
              venueName: booking.venue_name,
              bookingDate: booking.booking_date,
              startTime: booking.start_time,
              endTime: booking.end_time,
              address: booking.address,
              inviteLink: booking.id, // Just pass the ID, we construct the full URL in the function
              venueId: booking.venue_id,
              specialRequests: booking.special_requests,
              guests: booking.guests,
              hostName: booking.customer_name,
              contactEmail: booking.customer_email,
              contactPhone: booking.customer_phone
            })
          });
          
          const responseData = await response.json();
          
          if (!response.ok) {
            console.error("Error sending email:", responseData);
            failedSends.push({ email: trimmedEmail, error: responseData.message || responseData.error || "Failed to send invitation" });
          } else {
            successfulSends.push(trimmedEmail);
            console.log("Successfully sent invite to:", trimmedEmail, "Response:", responseData);
          }
        } catch (emailErr: any) {
          console.error("Exception sending email:", emailErr);
          failedSends.push({ email: trimmedEmail, error: emailErr.message });
        }
      }
      
      // Add successful sends to the sent emails list
      if (successfulSends.length > 0) {
        setSentEmails(prev => [...prev, ...successfulSends]);
        
        toast({
          title: "Invitations sent!",
          description: `Successfully sent invitations to ${successfulSends.length} guest(s).`,
        });
        
        // Reset form state if at least some were successful
        if (successfulSends.length === validEmails.length) {
          setEmails(['']);
          setNames(['']);
        } else {
          // Keep emails that failed to send
          const failedEmails = failedSends.map(fail => fail.email);
          const failedIndices = failedEmails.map(email => validEmails.indexOf(email));
          
          setEmails(failedEmails.length > 0 ? failedEmails : ['']);
          setNames(failedEmails.length > 0 ? failedIndices.map(idx => idx !== -1 ? validNames[idx] : '') : ['']);
        }
      }
      
      if (failedSends.length > 0) {
        const errorDetails = failedSends.map(f => `${f.email}: ${f.error}`).join('; ');
        setErrorMessage(`Failed to send ${failedSends.length} invitation(s): ${errorDetails}`);
        toast({
          title: "Some invitations failed",
          description: `Failed to send ${failedSends.length} invitation(s). Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      setErrorMessage(error?.message || "There was an error sending the invitations. Please try again.");
      toast({
        title: "Failed to send invitations",
        description: error?.message || "There was an error sending the invitations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[1003] max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Mail className="h-5 w-5 text-teal-400" />
            <span className="text-xl">Invite Guests</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="mb-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-medium mb-2 text-teal-400">Event Details:</h3>
            <p className="text-slate-300">{booking.venue_name}</p>
            <p className="text-slate-300">{formattedDate}</p>
            <p className="text-slate-300">{booking.start_time} - {booking.end_time}</p>
            {booking.address && <p className="text-slate-300">{booking.address}</p>}
          </div>
          
          {errorMessage && (
            <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-200">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Some invitations failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {sentEmails.length > 0 && (
            <div className="mb-4 p-4 border border-teal-500/30 rounded-lg bg-teal-500/10">
              <h3 className="text-sm font-medium flex items-center gap-1 text-teal-400 mb-2">
                <Check className="h-4 w-4" /> Invitations Sent
              </h3>
              <div className="space-y-1">
                {sentEmails.map((email, idx) => (
                  <p key={`sent-${idx}`} className="text-sm text-teal-300/80 flex items-center gap-2">
                    <Check className="h-3 w-3 text-teal-400" /> {email}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2 text-slate-100">
              <User className="h-4 w-4 text-teal-400" />
              Guest Information:
            </h3>
            {emails.map((email, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2 relative">
                  <Input
                    type="text"
                    placeholder="Guest Name (optional)"
                    value={names[index] || ''}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    className="flex-grow bg-slate-800 border-slate-700 text-slate-100 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div className="flex items-center gap-2 relative">
                  <Input
                    type="email"
                    placeholder="guest@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    className="flex-grow bg-slate-800 border-slate-700 text-slate-100 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    disabled={emails.length === 1}
                    className="absolute right-2 focus:outline-none text-slate-400 hover:text-slate-300"
                    aria-label="Remove email field"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmailField}
              className="w-full mt-2 border-teal-500/30 text-teal-400 bg-transparent hover:bg-teal-500/10 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Guest
            </Button>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 border-t border-slate-800 pt-4">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
            Cancel
          </Button>
          <Button 
            onClick={sendInvitations}
            className="bg-teal-500 hover:bg-teal-600 text-slate-900 flex items-center gap-2"
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
