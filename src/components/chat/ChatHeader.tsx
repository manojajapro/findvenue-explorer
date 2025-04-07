
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { ChatContact } from './types';

type ChatHeaderProps = {
  contact: ChatContact;
};

const ChatHeader = ({ contact }: ChatHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="p-4 border-b border-white/10 bg-findvenue-surface/20 flex items-center gap-4">
      <Button 
        variant="ghost" 
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-findvenue-surface/50" 
        onClick={() => navigate('/messages')}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 border-2 border-white/10">
          <AvatarImage src={contact.image} alt={contact.name} />
          <AvatarFallback className="bg-findvenue text-white font-medium">
            {contact.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">
              {contact.name}
            </h3>
            {contact.role && (
              <Badge variant="outline" className="text-xs font-normal">
                {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
              </Badge>
            )}
          </div>
          {contact.status && (
            <p className="text-sm text-findvenue-text-muted">{contact.status}</p>
          )}
        </div>
      </div>
      
      {contact.venue_name && (
        <Badge variant="outline" className="bg-findvenue/10 text-findvenue">
          {contact.venue_name}
        </Badge>
      )}
    </div>
  );
};

export default ChatHeader;
