
import React from "react";
import { MessageCircle } from "lucide-react";

/**
 * Header for venue assistant chatbots.
 * Usage:
 * <VenueAssistantHeader venueName="Opera" />
 * or for homepage: <VenueAssistantHeader />
 */
const VenueAssistantHeader: React.FC<{ venueName?: string }> = ({ venueName }) => (
  <div className="flex items-center gap-2 border-b border-findvenue-surface/20 pb-2 mb-2 px-2">
    <div className="rounded-full bg-findvenue text-white flex items-center justify-center w-10 h-10 text-2xl shadow">
      <MessageCircle className="w-6 h-6" />
    </div>
    <div>
      <div className="font-bold text-lg text-findvenue">
        {venueName ? `${venueName} Venue Assistant` : "Venue Assistant"}
      </div>
      <div className="text-findvenue-text-muted text-xs">
        {venueName
          ? `Hi! I'm your assistant for ${venueName}. Ask me anything about this venue!`
          : "Hi! I'm your venue assistant. Ask me anything about venues, booking, or events!"}
      </div>
    </div>
  </div>
);

export default VenueAssistantHeader;
