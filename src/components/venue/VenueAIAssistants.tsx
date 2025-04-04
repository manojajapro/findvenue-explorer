
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Mic, MessageSquare } from 'lucide-react';

interface VenueAIAssistantsProps {
  venue: Venue | null;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [activeTab, setActiveTab] = useState<string>('voice');
  
  return (
    <div className="my-8">
      <h2 className="text-xl font-semibold mb-4">Venue AI Assistants</h2>
      
      <Tabs defaultValue="voice" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Voice Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Chat Assistant</span>
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
  );
};

export default VenueAIAssistants;
