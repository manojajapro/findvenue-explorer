
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

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
        throw new Error("Could not identify venue owner");
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
        const message = `Hello! I'm interested in your venue "${venueName}". Can you provide more information?`;
        
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
      
    } catch (error: any) {
      console.error('Error initiating chat:', error);
      setError(error.message || 'Failed to start conversation. Please try again.');
    } finally {
      setIsInitiating(false);
    }
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        className="w-full mt-2 border-white/20 hover:bg-findvenue/10 transition-colors"
        onClick={() => setIsDialogOpen(true)}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Message Venue Host
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Venue Host</DialogTitle>
          </DialogHeader>
          
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="py-6">
              <p className="mb-4">
                Start a conversation with <strong>{ownerName}</strong>, the host of <strong>{venueName}</strong>.
              </p>
              <p className="text-sm text-findvenue-text-muted mb-6">
                You'll be able to discuss details, ask questions, and negotiate terms directly.
              </p>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-findvenue hover:bg-findvenue-dark"
                  onClick={initiateChat}
                  disabled={isInitiating}
                >
                  {isInitiating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Start Conversation
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactVenueOwner;
