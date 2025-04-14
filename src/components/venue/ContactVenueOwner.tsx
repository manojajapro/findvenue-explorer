
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2, Clock, BarChart2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

type ContactVenueOwnerProps = {
  venueId: string;
  venueName: string;
  ownerId: string;
  ownerName: string;
};

const ContactVenueOwner = ({ venueId, venueName, ownerId, ownerName }: ContactVenueOwnerProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(`Hello! I'm interested in your venue "${venueName}". Can you provide more information?`);

  // Display an error if we don't have valid owner information
  const ownerError = !ownerId || !ownerName;

  const initiateChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      setIsInitiating(true);
      setError(null);
      
      console.log("Initiating chat with venue owner:", {
        venueId,
        venueName,
        ownerId,
        ownerName,
        currentUser: user.id
      });
      
      if (!ownerId) {
        throw new Error("Unable to connect to the venue host at this time");
      }

      // Get user profile if not available in context
      let senderName = '';
      if (profile) {
        senderName = `${profile.first_name} ${profile.last_name}`;
      } else {
        // Fallback if profile is not available
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();
          
        if (!userError && userData) {
          senderName = `${userData.first_name} ${userData.last_name}`;
        } else {
          senderName = 'User';
          console.warn("Could not get user profile data:", userError);
        }
      }
      
      // Check if a conversation already exists
      const { data: existingMessages, error: checkError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${ownerId}),and(sender_id.eq.${ownerId},receiver_id.eq.${user.id})`)
        .limit(1);
      
      if (checkError) {
        console.error("Error checking existing conversation:", checkError);
        throw new Error("Failed to check existing conversation");
      }
      
      if (!existingMessages || existingMessages.length === 0) {
        // Create initial message
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: ownerId,
            content: message,
            sender_name: senderName,
            receiver_name: ownerName,
            venue_id: venueId,
            venue_name: venueName,
            read: false
          })
          .select()
          .single();
        
        if (messageError) {
          console.error("Error creating initial message:", messageError);
          throw new Error("Failed to send initial message");
        }
        
        // Create notification for venue owner
        await supabase
          .from('notifications')
          .insert({
            user_id: ownerId,
            title: 'New Message',
            message: `${senderName} started a conversation with you about ${venueName}`,
            type: 'message',
            read: false,
            link: `/messages/${user.id}`,
            data: {
              sender_id: user.id,
              venue_id: venueId
            }
          });
      }
      
      // Navigate to messages
      navigate(`/messages/${ownerId}`);
      
      toast({
        title: "Message Sent",
        description: `You've started a conversation with ${ownerName}`,
      });
      
    } catch (error: any) {
      console.error('Error initiating chat:', error);
      setError(error.message || 'Failed to start conversation. Please try again.');
    } finally {
      setIsInitiating(false);
    }
  };
  
  return (
    <>
      <div className="bg-white dark:bg-findvenue-card-bg rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-white/10">
        <div className="p-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[#a1c181] rounded-full flex items-center justify-center text-white text-lg font-bold">
              {ownerName ? ownerName.charAt(0) : 'V'}
            </div>
          </div>
          
          <div className="flex-grow">
            <h4 className="font-semibold text-gray-900 dark:text-white">{ownerName || 'Venue Host'}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Event Manager for {venueName}
            </p>
            
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <BarChart2 className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span>Response rate - 99%</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span>Response time - 1h</span>
              </div>
            </div>
            
            <Button 
              variant="default"
              className="w-full mt-4 bg-findvenue hover:bg-findvenue-dark"
              onClick={() => setIsDialogOpen(true)}
              disabled={ownerError}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Message {ownerName || 'Venue Host'}
            </Button>
            
            {ownerError && (
              <div className="mt-2 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Host information unavailable</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-findvenue-card-bg border-white/10">
          <DialogHeader>
            <DialogTitle>Contact Venue Host</DialogTitle>
            <DialogDescription className="text-findvenue-text-muted">
              Start a conversation with {ownerName || 'the host'} about {venueName}.
            </DialogDescription>
          </DialogHeader>
          
          {error || ownerError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to connect</AlertTitle>
              <AlertDescription>
                {error || (ownerError ? "Host information is currently unavailable. Please try again later or contact support." : "")}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="py-4">
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">Your message:</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-findvenue-surface/50 border-white/10 h-32"
                  placeholder="Enter your message to the venue host..."
                />
              </div>
              
              <DialogFooter className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-findvenue hover:bg-findvenue-dark"
                  onClick={initiateChat}
                  disabled={isInitiating || !message.trim()}
                >
                  {isInitiating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactVenueOwner;
