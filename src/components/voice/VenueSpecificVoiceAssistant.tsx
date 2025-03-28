
import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Play, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useVenueVoiceAssistant from '@/hooks/useVenueVoiceAssistant';
import { Card } from '@/components/ui/card';

interface VenueSpecificVoiceAssistantProps {
  venue: any;
  isFullWidth?: boolean;
}

const VenueSpecificVoiceAssistant = ({ venue, isFullWidth = false }: VenueSpecificVoiceAssistantProps) => {
  const [continuousMode, setContinuousMode] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const responseRef = useRef<HTMLDivElement>(null);
  
  const {
    isListening,
    transcript,
    answer,
    error,
    isProcessing,
    startListening,
    stopListening,
    setTranscript
  } = useVenueVoiceAssistant({
    venue,
    autoRestart: continuousMode,
    onTranscript: (text) => {
      setUserTranscript(text);
    },
    onAnswer: (text) => {
      setAiResponses(prev => [...prev, text]);
    }
  });
  
  // Scroll to bottom of responses
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [aiResponses]);
  
  // Update transcript in parent component if needed
  useEffect(() => {
    if (transcript) {
      setUserTranscript(transcript);
    }
  }, [transcript]);
  
  // Add new answer to responses
  useEffect(() => {
    if (answer && !aiResponses.includes(answer)) {
      setAiResponses(prev => [...prev, answer]);
    }
  }, [answer, aiResponses]);
  
  // Clear transcript when starting to listen
  useEffect(() => {
    if (isListening) {
      setUserTranscript('');
    }
  }, [isListening]);
  
  const handleToggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  const handleToggleContinuousMode = () => {
    setContinuousMode(prev => !prev);
  };
  
  const handleClearResponses = () => {
    setAiResponses([]);
    setUserTranscript('');
    setTranscript('');
  };
  
  const handleManualSubmit = () => {
    if (userTranscript.trim()) {
      // Use the current transcript for processing
      setAiResponses(prev => [...prev, `You: ${userTranscript}`]);
      
      // This will trigger the onTranscript callback in useVenueVoiceAssistant
      if (!isProcessing) {
        startListening();
        stopListening();
      }
    }
  };
  
  return (
    <Card className={`${isFullWidth ? 'w-full' : 'w-full max-w-md'} glass-card border-white/10 p-4 rounded-xl flex flex-col`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold flex items-center">
          <Volume2 className="mr-2 h-5 w-5 text-findvenue" />
          Voice Assistant
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={continuousMode ? "default" : "outline"}
            size="sm"
            className={`px-3 py-1 h-8 ${continuousMode ? 'bg-findvenue hover:bg-findvenue-dark' : 'border-findvenue/30 text-findvenue hover:bg-findvenue/10'}`}
            onClick={handleToggleContinuousMode}
          >
            {continuousMode ? 'Continuous On' : 'Continuous Off'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8 text-findvenue-text-muted hover:text-white"
            onClick={handleClearResponses}
          >
            Clear
          </Button>
        </div>
      </div>
      
      <div 
        ref={responseRef}
        className="flex-grow bg-findvenue-surface/30 rounded-lg p-3 mb-3 overflow-y-auto"
        style={{ maxHeight: '200px', minHeight: '140px' }}
      >
        {aiResponses.length === 0 ? (
          <p className="text-findvenue-text-muted text-center mt-8">
            Ask me anything about this venue!
          </p>
        ) : (
          <div className="space-y-4">
            {aiResponses.map((response, index) => (
              <div key={index} className={`${index % 2 === 0 && response.startsWith('You:') ? 'text-findvenue-text-muted' : 'text-white'}`}>
                {response}
              </div>
            ))}
            {isProcessing && (
              <div className="text-findvenue animate-pulse">Thinking...</div>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-500 text-sm mb-2">{error}</p>
      )}
      
      <div className="flex items-center gap-2">
        <textarea
          value={userTranscript}
          onChange={(e) => {
            setUserTranscript(e.target.value);
            setTranscript(e.target.value);
          }}
          placeholder="Type or speak your question..."
          className="flex-grow bg-findvenue-surface/50 text-white border border-white/10 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-findvenue outline-none"
          rows={1}
        />
        
        <div className="flex space-x-2">
          <Button
            onClick={handleToggleListen}
            variant="outline"
            size="icon"
            className={`${isListening ? 'bg-findvenue text-white' : 'border-findvenue/30 text-findvenue hover:bg-findvenue/10'}`}
            disabled={isProcessing}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <Button
            onClick={handleManualSubmit}
            variant="default"
            size="icon"
            className="bg-findvenue hover:bg-findvenue-dark"
            disabled={isProcessing || !userTranscript.trim()}
          >
            <Play className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {isListening && (
        <div className="mt-2 text-center">
          <span className="text-findvenue text-sm animate-pulse">Listening...</span>
        </div>
      )}
    </Card>
  );
};

export default VenueSpecificVoiceAssistant;
