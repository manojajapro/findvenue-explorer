
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { Venue } from '@/hooks/useSupabaseVenues';
import { MessageSquare, Mic } from 'lucide-react';

type VenueAIAssistantsProps = {
  venue: Venue;
};

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [activeTab, setActiveTab] = useState('chat');
  
  if (!venue) return null;
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Ask About This Venue</h2>
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Venue Assistant</span>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="grid grid-cols-2 w-[200px]">
                <TabsTrigger value="chat" className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center">
                  <Mic className="w-4 h-4 mr-2" />
                  Voice
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="chat" className="mt-0 pt-4">
              <VenueSpecificChatBot venue={venue} />
            </TabsContent>
            <TabsContent value="voice" className="mt-0 pt-4">
              <VenueSpecificVoiceAssistant venue={venue} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueAIAssistants;
