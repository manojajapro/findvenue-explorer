import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ContactProps = {
  venueId: string;
  venueName: string;
  ownerId: string;
  ownerName: string;
};

const ContactVenueOwner = ({ venueId, venueName, ownerId, ownerName }: ContactProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingConversation, setIsCheckingConversation] = useState(true);
  const [existingMessages, setExistingMessages] = useState<any[]>([]);
  
  useEffect(() => {
    if (user && ownerId) {
      checkExistingMessages();
    } else {
      setIsCheckingConversation(false);
    }
  }, [user, ownerId]);

  const checkExistingMessages = async () => {
    try {
      setIsCheckingConversation(true);
      console.log("Checking for existing messages between", user?.id, "and", ownerId);
      
      if (!user?.id || !ownerId) {
        setError("Missing user or owner information. Cannot check messages.");
        setIsCheckingConversation(false);
        return;
      }
      
      // Check if messages table exists by trying to fetch one message
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${ownerId},receiver_id.eq.${ownerId}`)
          .limit(5);

        if (error) {
          console.error("Error checking messages:", error);
          throw new Error("Failed to check existing messages");
        }

        if (data && data.length > 0) {
          console.log("Existing messages found:", data.length);
          setExistingMessages(data);
        }
      } catch (err: any) {
        console.error("Error checking messages:", err);
        setError("Failed to check message status. Please try again later.");
      }
    } catch (error: any) {
      console.error("Error checking messages:", error);
      setError("Failed to check message status. Please try again later.");
    } finally {
      setIsCheckingConversation(false);
    }
  };
  
  const clearError = () => {
    if (error) setError(null);
  };
  
  const validateOwnerInfo = (): boolean => {
    if (!ownerId) {
      setError('Unable to contact venue owner. Owner information is missing.');
      return false;
    }
    return true;
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!user || !profile) {
      toast({
        title: 'Login Required',
        description: 'Please log in to contact the venue owner',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    if (!validateOwnerInfo()) {
      toast({
        title: 'Error',
        description: error || 'Unable to contact venue owner',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      console.log("Starting message send process to owner:", ownerId);
      
      // Send message directly to the messages table
      const { error: messageError, data: messageData } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: ownerId,
          content: message,
          read: false,
          sender_name: `${profile.first_name} ${profile.last_name}`,
          receiver_name: ownerName,
          venue_id: venueId,
          venue_name: venueName
        })
        .select()
        .single();
      
      if (messageError) {
        console.error("Error sending message:", messageError);
        throw messageError;
      }
      
      console.log('Message sent successfully:', messageData);
      
      // Create a notification for the owner
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          title: 'New Message',
          message: `${profile.first_name} ${profile.last_name} sent you a message about "${venueName}"`,
          type: 'message',
          read: false,
          link: '/messages',
          data: {
            sender_id: user.id,
            venue_id: venueId
          }
        });
      
      if (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Non-blocking error, don't throw
      }
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the venue owner',
      });
      
      setMessage('');
      
      if (ownerId) {
        navigate(`/messages/${ownerId}`);
      } else {
        toast({
          title: 'Warning',
          description: 'Could not open direct messages due to missing owner information',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleDirectMessageClick = () => {
    clearError();
    
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to contact the venue owner',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    
    if (!validateOwnerInfo()) {
      toast({
        title: 'Error',
        description: error || 'Unable to contact venue owner',
        variant: 'destructive',
      });
      return;
    }
    
    if (ownerId) {
      navigate(`/messages/${ownerId}`);
    } else {
      toast({
        title: 'Error',
        description: 'Owner ID is missing. Cannot start conversation.',
        variant: 'destructive',
      });
    }
  };
  
  if (!user) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-findvenue-text-muted mb-4">
              Please log in to contact the venue owner
            </p>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-findvenue hover:bg-findvenue-dark"
            >
              Login to Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isCheckingConversation) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-findvenue" />
            <p className="text-findvenue-text-muted mt-4">
              Checking conversation status...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          <span>Contact {ownerName || 'Venue Owner'}</span>
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSendMessage}>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Textarea
            placeholder={`Ask ${ownerName || 'the venue owner'} about ${venueName}...`}
            className="min-h-[120px] bg-findvenue-surface/20"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              clearError();
            }}
            disabled={isSending}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button"
            variant="outline"
            onClick={handleDirectMessageClick}
            disabled={isSending || !ownerId}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Direct Chat
          </Button>
          <Button 
            type="submit"
            className="bg-findvenue hover:bg-findvenue-dark"
            disabled={isSending || !message.trim() || !ownerId}
          >
            {isSending ? (
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
        </CardFooter>
      </form>
    </Card>
  );
};

export default ContactVenueOwner;
