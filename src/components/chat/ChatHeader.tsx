import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardHeader } from '@/components/ui/card';
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
    <CardHeader className="border-b border-white/10 py-4">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-findvenue-surface/50" 
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={contact.image || `https://api.dicebear.com/7.x/initials/svg?seed=${contact.name}`} 
              alt={contact.name}
            />
            <AvatarFallback className="bg-findvenue-surface text-findvenue">
              {contact.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {contact.name || 'Chat'}
              </h3>
              {contact.role && (
                <Badge 
                  variant="outline" 
                  className="text-xs font-normal"
                >
                  {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                </Badge>
              )}
            </div>
            {contact.status && (
              <p className="text-sm text-findvenue-text-muted">
                {contact.status}
              </p>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
