
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatContact } from './types';
import { getInitials } from '@/lib/utils';

type ChatHeaderProps = {
  contact: ChatContact;
}

const ChatHeader = ({ contact }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  return (
    <div className="p-3 border-b border-white/10 flex items-center gap-3">
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon"
          className="text-findvenue-text-muted hover:text-findvenue hover:bg-findvenue/10"
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
      <Avatar>
        <AvatarImage src={contact.image} alt={contact.name} />
        <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{contact.name}</h3>
        {contact.role && (
          <p className="text-xs text-findvenue-text-muted">
            {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
          </p>
        )}
      </div>
      
      {contact.venue_name && (
        <Badge variant="outline" className="bg-findvenue/10 border-findvenue/20">
          {contact.venue_name}
        </Badge>
      )}
    </div>
  );
};

export default ChatHeader;
