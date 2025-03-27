
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast({
        title: 'Login Required',
        description: 'Please log in to contact the venue owner',
        variant: 'destructive',
      });
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

    // Check if owner ID is valid
    if (!ownerId) {
      toast({
        title: 'Error',
        description: 'Unable to contact venue owner. Owner information is missing.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      // Insert the message
      const { error: messageError } = await supabase
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
        });
      
      if (messageError) throw messageError;
      
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
      navigate(`/messages/${ownerId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
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
          <Textarea
            placeholder={`Ask ${ownerName || 'the venue owner'} about ${venueName}...`}
            className="min-h-[120px] bg-findvenue-surface/20"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
          />
        </CardContent>
        <CardFooter className="flex justify-end">
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
