
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Bot, Mic, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import VenueUnifiedChatAssistant from '@/components/chat/VenueUnifiedChatAssistant';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VenueAIAssistantsProps {
  venue: Venue | null;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  const handleCloseChatDialog = () => setIsChatOpen(false);
  const handleCloseVoiceDialog = () => setIsVoiceOpen(false);
  
  return (
    <>
      {/* Fixed positioned AI assistant buttons - right bottom */}
      <TooltipProvider>
        {/* Text Chat Assistant Button */}
        <div className="fixed right-4 bottom-20 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsChatOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="Chat Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
              <p>Text Chat Assistant</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Voice Assistant Button */}
        <div className="fixed right-4 bottom-4 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsVoiceOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-purple-500/20"
                aria-label="Voice Assistant"
              >
                <Mic className="h-7 w-7" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-purple-950 text-white border-purple-800">
              <p>Voice Assistant</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      {/* Dialog for Text Chat assistant */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent 
          className="sm:max-w-[500px] p-0 overflow-hidden right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl"
        >
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={handleCloseChatDialog} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <div className="flex items-center px-4 py-3 border-b border-white/10">
            <Bot className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Chat with AI Assistant</h3>
          </div>
          
          <VenueUnifiedChatAssistant venue={venue} onClose={handleCloseChatDialog} />
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Voice assistant */}
      <Dialog open={isVoiceOpen} onOpenChange={setIsVoiceOpen}>
        <DialogContent 
          className="sm:max-w-[500px] p-0 overflow-hidden right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl"
        >
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={handleCloseVoiceDialog} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <div className="flex items-center px-4 py-3 border-b border-white/10">
            <Mic className="h-5 w-5 text-purple-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Voice Assistant</h3>
          </div>
          
          <div className="p-4">
            <VenueSpecificVoiceAssistant venue={venue} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VenueAIAssistants;
