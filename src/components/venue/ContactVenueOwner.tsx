
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
  const [existingConversation, setExistingConversation] = useState<any>(null);
  
  useEffect(() => {
    // When component mounts, check if conversation exists
    if (user && ownerId) {
      checkExistingConversation();
    } else {
      setIsCheckingConversation(false);
    }
  }, [user, ownerId]);

  const checkExistingConversation = async () => {
    try {
      setIsCheckingConversation(true);
      console.log("Checking for existing conversation between", user?.id, "and", ownerId);
      
      // First check if the conversations table exists
      const { error: tableCheckError } = await supabase
        .from('conversations')
        .select('count')
        .limit(1)
        .maybeSingle();
      
      if (tableCheckError) {
        if (tableCheckError.code === '42P01') {
          console.error("Conversations table does not exist:", tableCheckError);
          setError("The messaging system is currently unavailable. Please try again later.");
          setIsCheckingConversation(false);
          return;
        }
      }

      // Check for existing conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [user?.id, ownerId])
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error checking conversation:", error);
        throw new Error("Failed to check existing conversations");
      }

      if (data) {
        console.log("Existing conversation found:", data);
        setExistingConversation(data);
      }
    } catch (error: any) {
      console.error("Error checking conversation:", error);
      setError("Failed to check conversation status. Please try again later.");
    } finally {
      setIsCheckingConversation(false);
    }
  };
  
  // Clear error when inputs change
  const clearError = () => {
    if (error) setError(null);
  };
  
  // Validate owner information before proceeding
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

    // Validate owner information
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
      
      let conversationId = existingConversation?.id;
      
      // Create new conversation if one doesn't exist
      if (!conversationId) {
        console.log("Creating new conversation between", user.id, "and", ownerId);
        try {
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
              participants: [user.id, ownerId],
              venue_id: venueId,
              venue_name: venueName,
              last_message: message
            })
            .select('id')
            .single();
            
          if (createError) {
            console.error("Error creating conversation:", createError);
            throw createError;
          }
          
          console.log("New conversation created:", newConversation);
          conversationId = newConversation.id;
        } catch (err: any) {
          console.error("Failed to create conversation:", err);
          // If the table doesn't exist, we'll handle it gracefully
          if (err.code === '42P01') {
            setError("The messaging system is currently unavailable. Please try again later.");
            throw new Error("Conversations table does not exist");
          }
          throw err;
        }
      } else {
        // Update last message in conversation
        await supabase
          .from('conversations')
          .update({
            last_message: message,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }
      
      console.log("Sending message in conversation:", conversationId);
      
      // Insert the message
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
      
      // Create notification for the venue owner
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
        throw notificationError;
      }
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the venue owner',
      });
      
      setMessage('');
      
      // Navigate directly to messages with the specific contact
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
    
    // Validate owner information
    if (!validateOwnerInfo()) {
      toast({
        title: 'Error',
        description: error || 'Unable to contact venue owner',
        variant: 'destructive',
      });
      return;
    }
    
    // Navigate directly to the chat with this owner
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
