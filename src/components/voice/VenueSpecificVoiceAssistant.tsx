
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import useVenueVoiceAssistant from '@/hooks/useVenueVoiceAssistant';
import { Badge } from '@/components/ui/badge';

type VenueSpecificVoiceAssistantProps = {
  venue: any;
};

const VenueSpecificVoiceAssistant = ({ venue }: VenueSpecificVoiceAssistantProps) => {
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isListening,
    isProcessing,
    transcript,
    answer,
    startListening,
    stopListening,
    error,
  } = useVenueVoiceAssistant({
    venue,
    onTranscript: (text) => {
      if (text.trim()) {
        setTranscriptHistory(prev => [...prev, { text, isUser: true }]);
      }
    },
    onAnswer: (text) => {
      if (text.trim()) {
        setTranscriptHistory(prev => [...prev, { text, isUser: false }]);
      }
    }
  });

  const clearHistory = () => {
    setTranscriptHistory([]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptHistory]);

  return (
    <Card className="glass-card border-white/10 w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <div>
            Voice Assistant
            <p className="text-sm font-normal text-findvenue-text-muted mt-1">
              Speak to get information about {venue.name}
            </p>
          </div>
          {isListening && (
            <Badge className="bg-green-500 text-white animate-pulse">
              Listening...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 max-h-[50vh] overflow-y-auto">
        {transcriptHistory.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-findvenue-text-muted mb-2">
              Click the microphone button and ask a question about {venue.name}
            </p>
            <p className="text-sm text-findvenue-text-muted">
              Try asking: "What are the amenities?", "How many people can it host?", or "Tell me about the venue"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transcriptHistory.map((item, index) => (
              <div 
                key={index} 
                className={`flex ${item.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`px-4 py-2 rounded-lg max-w-[85%] ${
                    item.isUser 
                      ? 'bg-findvenue text-white rounded-tr-none' 
                      : 'bg-findvenue-surface/50 text-findvenue-text rounded-tl-none'
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-lg bg-findvenue-surface/50 text-findvenue-text rounded-tl-none">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="mt-2 p-2 bg-red-500/10 text-red-500 rounded text-sm">
            Error: {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t border-white/10 flex justify-between">
        <div className="flex gap-2">
          {transcriptHistory.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={clearHistory}
              disabled={isProcessing}
              title="Clear conversation"
              className="border-white/10 bg-findvenue-surface/50 hover:bg-findvenue-surface"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={isListening ? "bg-red-500 hover:bg-red-600" : "bg-findvenue hover:bg-findvenue-dark"}
          size="lg"
        >
          {isListening ? (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              Start Listening
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VenueSpecificVoiceAssistant;
