
import { useState } from 'react';
import { X, Mail, Plus, Check, Loader2 } from 'lucide-react';
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
      
      // Array to track successful inserts
      const successfulInserts = [];
      const failedInserts = [];
      
      // Store invitations in database using upsert to avoid duplicates
      for (const email of validEmails) {
        const trimmedEmail = email.toLowerCase().trim();
        
        console.log("Inserting invite for email:", trimmedEmail);
        
        const { data, error } = await supabase
          .from('booking_invites')
          .upsert({
            booking_id: booking.id,
            email: trimmedEmail,
            status: 'pending'
          }, { 
            onConflict: 'booking_id,email',
            returning: 'minimal'
          });
          
        if (error) {
          console.error("Error inserting invite:", error);
          failedInserts.push({ email: trimmedEmail, error: error.message });
        } else {
          successfulInserts.push(trimmedEmail);
          console.log("Successfully inserted invite for:", trimmedEmail);
        }
      }
      
      // Create shareable link for the invitation
      const inviteLink = `${window.location.origin}/booking-invite/${booking.id}`;
      
      console.log("Invitation link:", inviteLink);
      console.log("Successful inserts:", successfulInserts);
      console.log("Failed inserts:", failedInserts);
      
      if (successfulInserts.length > 0) {
        toast({
          title: "Invitations sent!",
          description: `Successfully sent invitations to ${successfulInserts.length} guest(s).`,
        });
        
        // Update sent emails for UI feedback
        setSentEmails(prev => [...prev, ...successfulInserts]);
      }
      
      if (failedInserts.length > 0) {
        toast({
          title: "Some invitations failed",
          description: `Failed to send ${failedInserts.length} invitation(s). Please try again.`,
          variant: "destructive",
        });
      }
      
      // Reset form state if at least some were successful
      if (successfulInserts.length > 0) {
        setEmails(['']);
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
      <DialogContent className="max-w-md glass-card border-white/10 bg-gradient-to-b from-findvenue-surface/20 to-transparent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-findvenue" />
            Invite Guests
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4 bg-findvenue/5 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2 text-findvenue">Event Details:</h3>
            <p className="text-sm text-findvenue-text-muted">{booking.venue_name}</p>
            <p className="text-sm text-findvenue-text-muted">{formattedDate}</p>
            <p className="text-sm text-findvenue-text-muted">{booking.start_time} - {booking.end_time}</p>
            {booking.address && <p className="text-sm text-findvenue-text-muted">{booking.address}</p>}
          </div>
          
          {sentEmails.length > 0 && (
            <div className="mb-4 p-3 border border-green-500/30 rounded-lg bg-green-500/10">
              <h3 className="text-sm font-medium flex items-center gap-1 text-green-500 mb-1">
                <Check className="h-4 w-4" /> Invitations Sent
              </h3>
              <div className="space-y-1">
                {sentEmails.map((email, idx) => (
                  <p key={`sent-${idx}`} className="text-xs text-green-500/80 flex items-center gap-1">
                    <Check className="h-3 w-3" /> {email}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-findvenue" />
              Guest Emails:
            </h3>
            {emails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="guest@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  className="flex-grow"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEmailField(index)}
                  disabled={emails.length === 1}
                  className="px-2 hover:bg-findvenue/10 hover:text-findvenue"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmailField}
              className="w-full mt-2 border-findvenue/30 text-findvenue hover:bg-findvenue/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Guest
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={sendInvitations}
            className="bg-findvenue hover:bg-findvenue-dark"
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
