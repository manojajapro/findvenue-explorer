
import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Mic, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VenueAIAssistantsProps {
  venue: Venue | null;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [activeTab, setActiveTab] = useState<string>('voice');
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Fixed positioned AI assistant buttons */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        <Button
          onClick={() => {
            setIsOpen(true);
            setActiveTab('chat');
          }}
          size="icon"
          className="bg-findvenue hover:bg-findvenue-dark rounded-full h-12 w-12 shadow-lg"
          aria-label="Chat Assistant"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        
        <Button
          onClick={() => {
            setIsOpen(true);
            setActiveTab('voice');
          }}
          size="icon"
          className="bg-findvenue hover:bg-findvenue-dark rounded-full h-12 w-12 shadow-lg"
          aria-label="Voice Assistant"
        >
          <Mic className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Dialog for AI assistants */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Venue Assistant</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Tabs defaultValue="voice" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span>Voice</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="voice">
                <VenueSpecificVoiceAssistant venue={venue} />
              </TabsContent>
              
              <TabsContent value="chat">
                <VenueSpecificChatBot venue={venue} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VenueAIAssistants;
