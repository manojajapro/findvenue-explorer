
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Mic } from 'lucide-react';
import ChatBot from '@/components/chat/ChatBot';
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { Venue } from '@/hooks/useSupabaseVenues';

interface VenueAIAssistantsProps {
  venue: Venue;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [activeTab, setActiveTab] = useState<string>('chat');

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="border-b border-white/10 pb-2">
        <CardTitle className="text-lg flex items-center">
          <Bot className="mr-2 h-5 w-5 text-findvenue" />
          AI Venue Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0 pb-0">
        <Tabs
          defaultValue="chat"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2 bg-findvenue-surface/50">
              <TabsTrigger value="chat" className="data-[state=active]:bg-findvenue">
                <Bot className="mr-2 h-4 w-4" /> Chat Assistant
              </TabsTrigger>
              <TabsTrigger value="voice" className="data-[state=active]:bg-findvenue">
                <Mic className="mr-2 h-4 w-4" /> Voice Assistant
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="p-0 m-0">
            <div className="p-4">
              <p className="text-sm text-findvenue-text-muted mb-4">
                Ask questions about this venue, such as availability, pricing, or amenities.
              </p>
              <VenueSpecificChatBot venue={venue} />
            </div>
          </TabsContent>
          
          <TabsContent value="voice" className="p-0 m-0">
            <div className="p-4">
              <p className="text-sm text-findvenue-text-muted mb-4">
                Ask questions using your voice. Tap the microphone and speak clearly.
              </p>
              <VenueSpecificVoiceAssistant venue={venue} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VenueAIAssistants;
