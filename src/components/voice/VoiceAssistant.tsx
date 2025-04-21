
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from '@/hooks/use-toast';

const VoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Use our custom hooks for speech functionality
  const { speak, stop, isSupported: speechSynthesisSupported } = useSpeechSynthesis();
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Speech recognition with our custom hook
  const { startListening, stopListening, isSupported: speechRecognitionSupported } = useSpeechRecognition({
    onResult: (text) => {
      setTranscript(text);
      handleVoiceCommand(text);
      setMicActive(false);
    },
    onEnd: () => setMicActive(false),
    onError: (err) => { 
      setMicError(err); 
      setMicActive(false);
      
      toast({
        title: "Speech Recognition Error",
        description: err || "An error occurred with speech recognition"
      });
    }
  });
  
  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    let responseText = '';
    
    // Simple command handling logic - in a real app, connect to an AI service
    if (lowerCommand.includes('find venue') || lowerCommand.includes('search')) {
      responseText = 'I can help you search for venues. What type of event are you planning?';
    } else if (lowerCommand.includes('wedding venue') || lowerCommand.includes('wedding space')) {
      responseText = 'I found 58 wedding venues across Saudi Arabia. The most popular ones are in Riyadh and Jeddah. Would you like me to list some options?';
    } else if (lowerCommand.includes('riyadh')) {
      responseText = 'Riyadh has 245 venues available. Popular options include the Four Seasons Ballroom and Waldorf Grand Hall.';
    } else if (lowerCommand.includes('jeddah')) {
      responseText = 'There are 178 venues in Jeddah. Many feature beautiful views of the Red Sea. The Marsa Beach Venue is highly rated.';
    } else if (lowerCommand.includes('capacity') || lowerCommand.includes('guest')) {
      responseText = 'I can filter venues by capacity. The largest venue in our system can accommodate up to 1,200 guests.';
    } else if (lowerCommand.includes('price') || lowerCommand.includes('cost')) {
      responseText = 'Venues range in price from 5,000 to 50,000 SAR, depending on location, size, and amenities.';
    } else if (lowerCommand.includes('thank you') || lowerCommand.includes('thanks')) {
      responseText = 'You\'re welcome! Is there anything else I can help you with?';
    } else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      responseText = 'Hello! I\'m your FindVenue voice assistant. How can I help you today?';
    } else {
      responseText = 'I didn\'t quite understand that. You can ask me to search for venues, find spaces in specific cities, or get details about venue capacities and pricing.';
    }
    
    setResponse(responseText);
    handleSpeakResponse(responseText);
  };
  
  // Enhanced: allow direct browser speech synthesis for responses
  const handleSpeakResponse = (text: string) => {
    if (!speechSynthesisSupported) {
      toast({
        title: "Speech Synthesis Not Available",
        description: "Your browser does not support speech synthesis."
      });
      return;
    }
    
    speak(text, () => setIsSpeaking(true), () => setIsSpeaking(false));
  };
  
  const handleMicStart = () => {
    if (!speechRecognitionSupported) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser does not support speech recognition."
      });
      return;
    }
    
    setMicActive(true);
    startListening().catch((err) => {
      setMicActive(false);
      setMicError("Could not access microphone. Please ensure microphone permissions are granted.");
      
      toast({
        title: "Microphone Access Error",
        description: "Could not access microphone. Please ensure microphone permissions are granted.",
        variant: "destructive"
      });
    });
  };
  
  const handleMicStop = () => {
    setMicActive(false);
    stopListening();
  };
  
  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            isOpen ? "bg-findvenue-dark" : "bg-findvenue"
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close Voice Assistant" : "Open Voice Assistant"}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </div>
      
      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 left-6 z-50 w-full max-w-md transition-all duration-500 transform",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
        )}
      >
        <Card className="overflow-hidden border border-white/10 shadow-xl bg-findvenue-card-bg">
          {/* Header */}
          <div className="bg-findvenue p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Volume2 className="h-5 w-5 mr-2 text-white" />
              <h3 className="font-semibold text-white">Voice Assistant</h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-findvenue-dark"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {/* --- Main Content --- */}
          <div className="p-6 flex flex-col items-center">
            {(micActive) ? (
              <>
                <div className="w-20 h-20 rounded-full bg-findvenue-surface flex items-center justify-center mb-6 relative">
                  <div className="absolute w-full h-full rounded-full bg-findvenue/20 animate-ping"></div>
                  <Mic className="h-8 w-8 text-findvenue" />
                </div>
                <p className="text-center text-lg font-medium mb-2">Listening...</p>
                <p className="text-center text-findvenue-text-muted text-sm mb-6">
                  Speak clearly into your microphone
                </p>
                <Button 
                  variant="outline" 
                  className="border-findvenue-gold text-findvenue-gold hover:bg-findvenue-gold/10"
                  onClick={handleMicStop}
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </Button>
                {micError && (
                  <div className="mt-2 text-sm text-red-400">{micError}</div>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-findvenue-surface flex items-center justify-center mb-6">
                  <Mic className="h-8 w-8 text-findvenue" />
                </div>
                {transcript && (
                  <div className="w-full mb-4">
                    <p className="text-sm text-findvenue-text-muted mb-2">You said:</p>
                    <div className="p-3 bg-findvenue-surface/50 rounded-lg text-findvenue-text">
                      {transcript}
                    </div>
                  </div>
                )}
                {response && (
                  <div className="w-full mb-3 flex flex-row">
                    <div className="flex-1 mb-3">
                      <p className="text-sm text-findvenue-text-muted mb-2">Assistant:</p>
                      <div className="p-3 bg-findvenue/10 rounded-lg text-findvenue-text">
                        {response}
                      </div>
                    </div>
                    {speechSynthesisSupported && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Hear response"
                        className="ml-2 h-8 w-8"
                        onClick={() => handleSpeakResponse(response)}
                      >
                        <Volume2 className="h-5 w-5 text-findvenue" />
                      </Button>
                    )}
                  </div>
                )}
                {isSpeaking ? (
                  <Button 
                    className="bg-findvenue-dark hover:bg-findvenue-dark/80"
                    onClick={stop}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop Speaking
                  </Button>
                ) : (
                  <>
                    <Button 
                      className="bg-findvenue hover:bg-findvenue-dark mr-2"
                      onClick={handleMicStart}
                      disabled={!speechRecognitionSupported}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Start Speaking
                    </Button>
                  </>
                )}
                
                {speechRecognitionSupported === false && (
                  <div className="mt-3 py-2 px-3 bg-yellow-500/20 text-yellow-400 text-sm rounded border border-yellow-500/30">
                    <p>Speech recognition is not supported in your browser. Please try using Chrome, Edge, or Safari.</p>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Tips */}
          <div className="p-4 border-t border-white/10 bg-findvenue-dark-bg/75">
            <p className="text-xs text-findvenue-text-muted text-center">
              Try saying: "Find wedding venues in Riyadh" or "Show me venues for 200 guests"
            </p>
          </div>
        </Card>
      </div>
    </>
  );
};

export default VoiceAssistant;
