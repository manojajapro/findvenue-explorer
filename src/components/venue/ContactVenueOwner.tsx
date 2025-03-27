
import { useState } from 'react';
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
      
      if (messageError) throw messageError;
      
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
      
      if (notificationError) throw notificationError;
      
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
    navigate(`/messages/${ownerId}`);
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
            disabled={!ownerId}
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
