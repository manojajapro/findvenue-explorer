
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface VenueSpecificVoiceAssistantProps {
  venue: Venue | null;
}

const VenueSpecificVoiceAssistant = ({ venue }: VenueSpecificVoiceAssistantProps) => {
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [autoListenMode, setAutoListenMode] = useState(true);
  const [initialGreetingPlayed, setInitialGreetingPlayed] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [lastTranscript, setLastTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { 
    isListening,
    transcript,
    startListening,
    stopListening,
    isProcessing,
    audioEnabled,
    toggleAudio,
    error
  } = useVenueVoiceAssistant({
    venue,
    autoRestart: false,
    onTranscript: (text) => {
      // Save the latest transcript to prevent repetition
      setLastTranscript(text);
    },
    onAnswer: (response) => {
      // Only add the user's transcript if it's different from the last one added
      if (lastTranscript && !transcriptHistory.some(item => item.isUser && item.text === lastTranscript)) {
        setTranscriptHistory(prev => [...prev, { text: lastTranscript, isUser: true }]);
      }
      
      // Add the assistant's response
      setTranscriptHistory(prev => [...prev, { text: response, isUser: false }]);
      
      // If auto-listen mode is enabled, restart listening once response is spoken
      if (autoListenMode) {
        setTimeout(() => {
          startListening().catch(() => {
            toast({
              title: "Error",
              description: "Could not automatically restart listening",
              variant: "destructive"
            });
          });
        }, 1000);
      }
    }
  });
  
  // Scroll to bottom when transcript history updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptHistory]);
  
  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error || "There was an error with the voice assistant",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  const handleMicToggle = async () => {
    try {
      if (isListening) {
        stopListening();
        toast({
          title: "Voice Assistant Stopped",
          description: "Stopped listening",
        });
      } else {
        await startListening();
        toast({
          title: "Voice Assistant Active",
          description: autoListenMode 
            ? "Continuous mode enabled - I'll keep listening after each response" 
            : "Press the mic button again when you finish speaking",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please ensure microphone permissions are granted.",
        variant: "destructive"
      });
    }
  };
  
  const handleVoiceOutputToggle = () => {
    toggleAudio();
    setVoiceOutputEnabled(!audioEnabled);
    
    toast({
      title: audioEnabled ? "Voice Output Disabled" : "Voice Output Enabled",
      description: audioEnabled 
        ? "The assistant will respond with text only" 
        : "The assistant will respond with voice and text",
    });
  };

  // Play initial greeting when the component mounts
  useEffect(() => {
    if (venue && !initialGreetingPlayed && transcriptHistory.length === 0) {
      const initialInfo = `Welcome! I'm your virtual assistant for ${venue.name}. This ${venue.category || 'venue'} is located in ${venue.city} and can accommodate ${venue.capacity.min}-${venue.capacity.max} people. How can I help you today?`;
      
      setTranscriptHistory([{ text: initialInfo, isUser: false }]);
      setInitialGreetingPlayed(true);
      
      // Start listening automatically after greeting
      if (autoListenMode) {
        setTimeout(() => {
          startListening().catch(err => {
            console.error("Failed to auto-start listening:", err);
          });
        }, 3000);
      }
    }
  }, [venue, initialGreetingPlayed, transcriptHistory.length, autoListenMode, startListening]);

  // If venue is not available, show loading or error state
  if (!venue) {
    return (
      <div className="bg-findvenue-card-bg border border-white/10 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-medium mb-2">Voice Assistant</h3>
        <p className="text-findvenue-text-muted">Venue information is loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-findvenue-card-bg border border-white/10 rounded-lg p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Voice Assistant</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`${voiceOutputEnabled ? 'border-green-500' : 'border-white/10'}`}
            onClick={handleVoiceOutputToggle}
          >
            {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant={isListening ? "default" : "outline"}
            size="sm"
            onClick={handleMicToggle}
            className={isListening ? "bg-green-600 hover:bg-green-700" : "border-white/10"}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <Separator className="mb-4" />
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-findvenue-text-muted">Auto-listen mode</span>
        <Switch 
          checked={autoListenMode} 
          onCheckedChange={setAutoListenMode} 
        />
      </div>
      
      <ScrollArea className="h-60 mb-4 rounded-md border border-white/10 p-4">
        {transcriptHistory.length === 0 ? (
          <div className="text-center py-10 text-findvenue-text-muted">
            <p>No conversation history yet.</p>
            <p className="text-xs mt-2">Click the microphone to start talking to your AI venue assistant</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transcriptHistory.map((item, index) => (
              <div 
                key={index} 
                className={`flex gap-2 p-3 rounded-lg text-sm ${
                  item.isUser 
                    ? 'bg-findvenue/20 ml-8' 
                    : 'bg-gray-700/30 mr-8'
                }`}
              >
                {item.isUser ? (
                  <User className="h-4 w-4 mt-1 shrink-0" />
                ) : (
                  <Bot className="h-4 w-4 mt-1 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-medium mb-1">{item.isUser ? 'You' : 'Assistant'}</p>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {isListening && (
        <div className="text-center py-2 px-4 bg-findvenue/10 rounded-md text-sm border border-dashed border-white/10 animate-pulse">
          Listening... {transcript ? `"${transcript}"` : "Say something about this venue"}
        </div>
      )}
      
      {isProcessing && (
        <div className="text-center py-2 px-4 bg-green-600/10 rounded-md text-sm border border-dashed border-green-500/30 mt-2">
          Processing... <Loader2 className="h-3 w-3 inline-block ml-1 animate-spin" />
        </div>
      )}
    </div>
  );
};

export default VenueSpecificVoiceAssistant;
