
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Venue } from '@/hooks/useSupabaseVenues';
import { MessageSquare } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import VenueUnifiedChatAssistant from '@/components/chat/VenueUnifiedChatAssistant';

interface VenueAIAssistantsProps {
  venue: Venue | null;
}

const VenueAIAssistants = ({ venue }: VenueAIAssistantsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Fixed positioned AI assistant button - right bottom */}
      <div className="fixed right-4 bottom-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="bg-blue-600 hover:bg-blue-700 rounded-full h-14 w-14 shadow-xl flex items-center justify-center"
          aria-label="AI Assistant"
        >
          <MessageSquare className="h-7 w-7" />
        </Button>
      </div>
      
      {/* Dialog for AI assistant */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[450px] p-0 overflow-hidden right-[5%] sm:right-[5%] translate-x-0"
        >
          <VenueUnifiedChatAssistant 
            venue={venue} 
            onClose={() => setIsOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VenueAIAssistants;
