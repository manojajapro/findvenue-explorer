
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Bot, Mic, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import VenueUnifiedChatAssistant from '@/components/chat/VenueUnifiedChatAssistant';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VenueAIAssistantsProps {
  venue: Venue | null;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
  
  return (
    <>
      {/* Fixed positioned AI assistant button - right bottom */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed right-4 bottom-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="AI Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
            <p>Chat with AI Venue Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Dialog for AI assistant */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[500px] p-0 overflow-hidden right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl"
        >
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-2 p-1 bg-slate-900/70 border-b border-white/5">
              <TabsTrigger value="chat" className="data-[state=active]:bg-blue-700/30 data-[state=active]:text-blue-400">
                <Bot className="h-4 w-4 mr-2" /> Text Chat
              </TabsTrigger>
              <TabsTrigger value="voice" className="data-[state=active]:bg-blue-700/30 data-[state=active]:text-blue-400">
                <Mic className="h-4 w-4 mr-2" /> Voice Assistant
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="p-0 m-0">
              <VenueUnifiedChatAssistant venue={venue} onClose={() => setIsOpen(false)} />
            </TabsContent>
            
            <TabsContent value="voice" className="p-0 m-0">
              <div className="p-4">
                <VenueSpecificVoiceAssistant venue={venue} />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VenueAIAssistants;
