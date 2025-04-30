
import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import WhatsAppIntegration from '../chat/WhatsAppIntegration';
import { getVenueOwnerPhone } from '@/utils/venueHelpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VenueOwnerChatButtonProps {
  ownerId: string;
  ownerName?: string;
  venueId: string;
  venueName: string;
  ownerPhone?: string;
}

const VenueOwnerChatButton = ({ 
  ownerId, 
  ownerName = 'Venue Owner', 
  venueId, 
  venueName,
  ownerPhone
}: VenueOwnerChatButtonProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInitiating, setIsInitiating] = useState(false);
  const [ownerPhoneNumber, setOwnerPhoneNumber] = useState<string | undefined>(ownerPhone);

  // If ownerPhone wasn't provided, fetch it
  useEffect(() => {
    const fetchOwnerPhone = async () => {
      if (ownerPhone || !ownerId) return;
      
      try {
        const phoneNumber = await getVenueOwnerPhone(ownerId);
        if (phoneNumber) {
          setOwnerPhoneNumber(phoneNumber);
        }
      } catch (err) {
        console.error('Error fetching owner phone number:', err);
      }
    };
    
    fetchOwnerPhone();
  }, [ownerId, ownerPhone]);

  const handleChatWithOwner = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "You need to login to chat with venue owners",
      });
      navigate('/login');
      return;
    }
    
    if (user.id === ownerId) {
      toast({
        title: "Can't chat with yourself",
        description: "You own this venue",
      });
      return;
    }
    
    setIsInitiating(true);
    
    try {
      // Initialize chat by sending a first message if needed
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${ownerId},receiver_id.eq.${ownerId}`)
        .eq('venue_id', venueId)
        .limit(1);
      
      // If no previous messages, create initial message
      if (!existingMessages || existingMessages.length === 0) {
        // Get user profile for sender name
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        const senderName = userProfile 
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : 'Customer';
        
        // Create first message
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: ownerId,
          sender_name: senderName,
          receiver_name: ownerName || 'Venue Owner',
          content: `Hi, I'm interested in ${venueName}.`,
          venue_id: venueId,
          venue_name: venueName
        });
      }
      
      // Navigate to messages with the owner
      navigate(`/messages/${ownerId}?venueId=${venueId}&venueName=${encodeURIComponent(venueName)}`);
    } catch (error) {
      console.error('Error initiating chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          className="w-full" 
          variant="outline"
          disabled={isInitiating}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          {isInitiating ? 'Connecting...' : 'Contact Venue Owner'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-findvenue-card-bg border-white/10 w-56">
        <DropdownMenuItem onClick={handleChatWithOwner} className="cursor-pointer focus:bg-findvenue/10">
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>Chat in App</span>
        </DropdownMenuItem>
        {(ownerPhoneNumber || ownerPhone) && (
          <DropdownMenuItem className="p-0 focus:bg-transparent cursor-default">
            <div className="w-full">
              <WhatsAppIntegration 
                recipientName={ownerName || 'Venue Owner'} 
                recipientPhone={ownerPhoneNumber || ownerPhone || ''}
                venueName={venueName}
                messageText={`Hi! I'm interested in your venue "${venueName}". Can you provide more information?`}
              />
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VenueOwnerChatButton;
