import { useState } from 'react';
import { Button } from '@/components/ui/button'; 
import { MessageCircle, Mic, MicOff } from 'lucide-react';
import { useVenueVoiceAssistant } from "@/hooks/useVenueVoiceAssistant";
import { Venue } from '@/hooks/useSupabaseVenues';

interface VenueSpecificVoiceAssistantProps {
  venue: Venue;
}

const VenueSpecificVoiceAssistant = ({ venue }: VenueSpecificVoiceAssistantProps) => {
  const { 
    messages, 
    isListening, 
    transcript, 
    isProcessing, 
    isLoading, 
    toggleListening, 
    submitVoiceInput, 
    clearMessages 
  } = useVenueVoiceAssistant();

  const [manualInput, setManualInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitVoiceInput(manualInput);
    setManualInput('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-findvenue-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Voice Assistant</h3>
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            Clear
          </Button>
        </div>
        
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={index} className={`p-3 rounded-md ${message.role === 'user' ? 'bg-findvenue-card-bg/50 text-right' : 'bg-findvenue-surface/50 text-left'}`}>
              <p className="text-sm">{message.content}</p>
            </div>
          ))}
        </div>
        
        {isListening && (
          <div className="mt-3 p-3 rounded-md bg-findvenue-card-bg/80">
            <p className="text-sm italic">Listening... Say something!</p>
            {transcript && <p className="text-sm mt-1">Transcript: {transcript}</p>}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mt-4 flex items-center">
          <input
            type="text"
            className="flex-grow rounded-md border border-findvenue-border px-3 py-2 mr-2 bg-findvenue-input text-sm"
            placeholder="Type your message..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={isListening || isProcessing}
          />
          <Button type="submit" disabled={isListening || isProcessing} className="bg-findvenue hover:bg-findvenue-dark">
            Send
          </Button>
        </form>
      </div>

      <Button 
        className="w-full bg-findvenue hover:bg-findvenue-dark"
        onClick={toggleListening} 
        disabled={isLoading}
      >
        {isListening ? (
          <>
            <MicOff className="mr-2 h-4 w-4" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Start Listening
          </>
        )}
      </Button>
    </div>
  );
}

export default VenueSpecificVoiceAssistant;
