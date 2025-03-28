
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { Venue } from '@/hooks/useSupabaseVenues';

interface VenueAIAssistantsProps {
  venue: Venue;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <Card className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
        </TabsList>
        <CardContent>
          <TabsContent value="chat" className="outline-none">
            <VenueSpecificChatBot venue={venue} />
          </TabsContent>
          <TabsContent value="voice" className="outline-none">
            <VenueSpecificVoiceAssistant venue={venue} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

export default VenueAIAssistants;
