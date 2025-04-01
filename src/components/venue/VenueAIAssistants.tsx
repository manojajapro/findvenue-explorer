
import React from 'react';
import VenueSpecificChatBot from '@/components/chat/VenueSpecificChatBot';
import VenueSpecificVoiceAssistant from '@/components/voice/VenueSpecificVoiceAssistant';
import { Venue } from '@/hooks/useSupabaseVenues';

type VenueAIAssistantsProps = {
  venue: Venue;
};

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  if (!venue) return null;
  
  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <VenueSpecificChatBot venue={venue} />
      </div>
      <div>
        <VenueSpecificVoiceAssistant venue={venue} />
      </div>
    </div>
  );
};

export default VenueAIAssistants;
