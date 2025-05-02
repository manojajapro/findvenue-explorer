
import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getVenueOwnerPhone } from '@/utils/venueHelpers';
import WhatsAppIntegration from '../chat/WhatsAppIntegration';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BookingOwnerChatProps {
  ownerId: string;
  ownerName?: string;
  venueId: string;
  venueName: string;
  bookingId: string;
}

const BookingOwnerChat = ({ 
  ownerId, 
  ownerName = 'Venue Owner', 
  venueId, 
  venueName,
  bookingId 
}: BookingOwnerChatProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ownerPhone, setOwnerPhone] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    const fetchOwnerPhone = async () => {
      if (!ownerId) return;
      
      try {
        const phoneNumber = await getVenueOwnerPhone(ownerId);
        if (phoneNumber) {
          setOwnerPhone(phoneNumber);
        }
      } catch (err) {
        console.error('Error fetching owner phone number:', err);
      }
    };
    
    fetchOwnerPhone();
  }, [ownerId]);
  
  if (!user) return null;
  
  const handleChat = async () => {
    try {
      // Get customer information
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      
      const customerName = userProfile 
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'Customer';
      
      // Navigate to messages with the user or venue owner
      navigate(`/messages/${ownerId}?venueId=${venueId}&venueName=${encodeURIComponent(venueName)}&bookingId=${bookingId}`);
      
    } catch (error) {
      console.error('Error in chat redirection:', error);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full border-findvenue text-findvenue hover:bg-findvenue/10"
      onClick={handleChat}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Contact {ownerName || 'Venue Owner'}
    </Button>
  );
};

export default BookingOwnerChat;
