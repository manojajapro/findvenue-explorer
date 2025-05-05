
import { useState, useEffect } from 'react';
import { X, Mail, Plus, Check, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface InviteGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    address?: string;
    guests?: number;
    special_requests?: string;
  };
}

export const InviteGuestsModal = ({ isOpen, onClose, booking }: InviteGuestsModalProps) => {
  const { toast } = useToast();
  const [emails, setEmails] = useState<string[]>(['']);
  const [isSending, setIsSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<string[]>([]);

  // Format date for display
  const formattedDate = format(new Date(booking.booking_date), 'MMMM d, yyyy');
  
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };
  
  const addEmailField = () => {
    setEmails([...emails, '']);
  };
  
  const removeEmailField = (index: number) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    setEmails(newEmails);
  };
  
  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => email === '' || emailRegex.test(email));
  };

  const sendInvitations = async () => {
    // Filter out empty emails
    const validEmails = emails.filter(email => email.trim() !== '');
    
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
      console.log("Booking ID:", booking.id);
      
      // Array to track successful sends
      const successfulSends = [];
      const failedSends = [];
      
      // Store invitations in database using upsert to avoid duplicates
      for (const email of validEmails) {
        const trimmedEmail = email.toLowerCase().trim();
        
        console.log("Processing invite for email:", trimmedEmail);
        
        // First, store in database
        const { data: dbData, error: dbError } = await supabase
          .from('booking_invites')
          .upsert({
            booking_id: booking.id,
            email: trimmedEmail,
            status: 'pending'
          }, { 
            onConflict: 'booking_id,email',
            returning: 'minimal'
          });
          
        if (dbError) {
          console.error("Error inserting invite:", dbError);
          failedSends.push({ email: trimmedEmail, error: dbError.message });
          continue;
        }
        
        // Generate invite link - using the booking-invite route
        const inviteLink = `${window.location.origin}/booking-invite/${booking.id}`;
        
        // Now, send email via edge function
        try {
          const { error: emailError } = await supabase.functions.invoke('send-booking-invite', {
            body: {
              email: trimmedEmail,
              venueName: booking.venue_name,
              bookingDate: booking.booking_date,
              startTime: booking.start_time,
              endTime: booking.end_time,
              address: booking.address,
              inviteLink: inviteLink,
              specialRequests: booking.special_requests,
              guests: booking.guests
            }
          });
          
          if (emailError) {
            console.error("Error sending email:", emailError);
            failedSends.push({ email: trimmedEmail, error: emailError.message });
          } else {
            successfulSends.push(trimmedEmail);
            console.log("Successfully sent invite to:", trimmedEmail);
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
        } else {
          // Keep emails that failed to send
          setEmails(failedSends.map(fail => fail.email));
        }
      }
      
      if (failedSends.length > 0) {
        toast({
          title: "Some invitations failed",
          description: `Failed to send ${failedSends.length} invitation(s). Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error sending invitations:", error);
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
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
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
              <Mail className="h-4 w-4 text-teal-400" />
              Guest Emails:
            </h3>
            {emails.map((email, index) => (
              <div key={index} className="flex items-center gap-2 relative">
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
