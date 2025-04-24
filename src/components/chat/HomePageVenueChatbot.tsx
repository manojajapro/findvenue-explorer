
import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';

const HomePageVenueChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isVenueOwner } = useAuth();
  const { messages, sendMessage, isLoading, error } = useChat({ 
    chatType: 'venue_search',
    venueId: null,
  });
  
  // Don't render anything if the user is a venue owner
  if (isVenueOwner) {
    return null;
  }

  return (
    <>
      {/* Fixed positioned chatbot button - right bottom */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed right-4 bottom-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="Venue Search Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
            <p>Chat with Venue Search Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Dialog for chatbot */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[500px] p-0 overflow-hidden max-h-[80vh] right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl"
        >
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <div className="flex flex-col h-[70vh]">
            <ChatHeader title="Venue Search Assistant" />
            <MessageList messages={messages} isLoading={isLoading} error={error} className="flex-grow overflow-y-auto p-4 space-y-4" />
            <MessageInput onSendMessage={sendMessage} isLoading={isLoading} className="p-4 border-t border-gray-800" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomePageVenueChatbot;
