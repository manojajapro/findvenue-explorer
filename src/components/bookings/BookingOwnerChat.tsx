
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type BookingOwnerChatProps = {
  ownerId: string | undefined;
  ownerName?: string;
  venueId: string;
  venueName: string;
  bookingId: string;
};

const BookingOwnerChat = ({ 
  ownerId, 
  ownerName = 'Venue Host',
  venueId,
  venueName,
  bookingId
}: BookingOwnerChatProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const initiateChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!ownerId) {
      toast.error('Cannot contact owner', {
        description: 'Owner information is not available'
      });
      return;
    }

    setIsLoading(true);

    try {
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
      
      // If no existing conversation, create initial message
      if (!existingMessages || existingMessages.length === 0) {
        const message = `Hello! I have questions about my booking (#${bookingId.substring(0, 8)}) for "${venueName}".`;
        
        const { error: messageError } = await supabase
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
          });
        
        if (messageError) {
          console.error("Error creating initial message:", messageError);
          throw new Error("Failed to send initial message");
        }
        
        // Create notification for venue owner
        await supabase
          .from('notifications')
          .insert({
            user_id: ownerId,
            title: 'Booking Question',
            message: `${senderName} has a question about their booking for ${venueName}`,
            type: 'message',
            read: false,
            link: `/messages/${user.id}`,
            data: {
              sender_id: user.id,
              venue_id: venueId,
              booking_id: bookingId
            }
          });
      }
      
      // Navigate to messages
      navigate(`/messages/${ownerId}`);
      
    } catch (error: any) {
      console.error('Error initiating chat:', error);
      toast.error('Failed to start conversation', {
        description: 'Please try again later'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full border-findvenue text-findvenue hover:bg-findvenue/10"
      onClick={initiateChat}
      disabled={isLoading || !ownerId}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <MessageCircle className="h-4 w-4 mr-2" />
      )}
      Chat with {ownerName || 'Owner'}
    </Button>
  );
};

export default BookingOwnerChat;
