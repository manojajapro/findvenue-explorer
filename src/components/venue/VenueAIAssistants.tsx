
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { MessageSquare, Mic } from 'lucide-react';

type VenueAIAssistantsProps = {
  venue?: any; // Using any for now as we don't know the exact venue type
};

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">AI Venue Assistants</h2>
      
      <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="chat" className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat Assistant
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center">
            <Mic className="w-4 h-4 mr-2" />
            Voice Assistant
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="pt-2">
          {venue && <VenueSpecificChatBot />}
        </TabsContent>
        
        <TabsContent value="voice" className="pt-2">
          {venue && <VenueSpecificVoiceAssistant venue={venue} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VenueAIAssistants;
