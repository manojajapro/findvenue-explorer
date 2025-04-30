
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';
import { ChatContact } from './types';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppIntegration from './WhatsAppIntegration';

interface ChatHeaderProps {
  contact: ChatContact;
}

const ChatHeader = ({ contact }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const [contactPhone, setContactPhone] = useState<string | undefined>(undefined);
  
  // Fetch contact's phone number if not already available
  useEffect(() => {
    const getContactPhone = async () => {
      if (!contact?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', contact.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data?.phone) {
          setContactPhone(data.phone);
        }
      } catch (error) {
        console.error('Error fetching contact phone number:', error);
      }
    };
    
    getContactPhone();
  }, [contact?.id]);

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-findvenue-surface/20">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost"
          size="icon" 
          className="md:hidden"
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar>
          <AvatarImage src={contact.image} />
          <AvatarFallback>
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="font-medium">{contact.name}</div>
          {contact.role && (
            <div className="text-xs text-findvenue-text-muted">
              {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {contact.venue_name && (
          <Badge variant="outline" className="bg-findvenue/20 text-white">
            {contact.venue_name}
          </Badge>
        )}
        
        {contactPhone && (
          <WhatsAppIntegration 
            recipientName={contact.name}
            recipientPhone={contactPhone}
            venueName={contact.venue_name}
            messageText={`Hi! I'm interested in discussing ${contact.venue_name || 'your venue'}.`}
          />
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
