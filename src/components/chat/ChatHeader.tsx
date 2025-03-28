
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
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
    <CardHeader className="pb-2">
      <CardTitle className="text-lg flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-1 p-0 h-8 w-8" 
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-6 w-6">
          <AvatarImage src={contact.image || `https://api.dicebear.com/7.x/initials/svg?seed=${contact.name}`} />
          <AvatarFallback className="bg-findvenue-surface text-findvenue">
            {contact.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <span>{contact.name || 'Chat'}</span>
        {contact.role && (
          <Badge variant="outline" className="ml-2 text-xs">
            {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
  );
};

export default ChatHeader;
