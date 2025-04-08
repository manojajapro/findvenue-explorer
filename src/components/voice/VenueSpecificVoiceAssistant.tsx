
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, User, Bot, RefreshCw, StopCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VenueSpecificVoiceAssistantProps {
  venue: Venue | null;
}

const VenueSpecificVoiceAssistant = ({ venue }: VenueSpecificVoiceAssistantProps) => {
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [autoListenMode, setAutoListenMode] = useState(true);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    error,
    isWelcomePlayed,
    forcePlayWelcome
  } = useVenueVoiceAssistant({
    venue,
    autoRestart: autoListenMode,
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
      setTranscriptHistory(prev => {
        const lastMessage = prev[prev.length - 1];
        // Prevent duplicate assistant responses
        if (lastMessage && !lastMessage.isUser && lastMessage.text === response) {
          return prev;
        }
        return [...prev, { text: response, isUser: false }];
      });
    },
    onSpeechStart: () => {
      setIsSpeaking(true);
    },
    onSpeechEnd: () => {
      setIsSpeaking(false);
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
    
    toast({
      title: audioEnabled ? "Voice Output Disabled" : "Voice Output Enabled",
      description: audioEnabled 
        ? "The assistant will respond with text only" 
        : "The assistant will respond with voice and text",
    });
  };
  
  const handleStopSpeaking = () => {
    // This stops the current speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  const handleClearConversation = () => {
    setTranscriptHistory([]);
    setLastTranscript("");
    toast({
      title: "Conversation Cleared",
      description: "Your conversation history has been cleared",
    });
  };

  // If venue is not available, show loading or error state
  if (!venue) {
    return (
      <Card className="bg-findvenue-card-bg border border-white/10 mt-6">
        <CardHeader>
          <CardTitle>Voice Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-findvenue-text-muted">Venue information is loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-findvenue-card-bg/80 backdrop-blur-sm border border-white/10 mt-6 shadow-lg">
      <CardHeader className="pb-2 border-b border-white/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle>AI Voice Assistant</CardTitle>
            <Badge variant="outline" className={isWelcomePlayed ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}>
              {isWelcomePlayed ? "Ready" : "Loading"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`${audioEnabled ? 'border-green-500 text-green-500' : 'border-white/10'}`}
              onClick={handleVoiceOutputToggle}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
              <span className="ml-2">{isListening ? 'Listening' : 'Start'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-findvenue-text-muted">Auto-listen mode</span>
            <Switch 
              checked={autoListenMode} 
              onCheckedChange={setAutoListenMode} 
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs hover:bg-findvenue/10"
              onClick={forcePlayWelcome}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Replay Welcome
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs hover:bg-red-500/10 text-red-400"
              onClick={handleClearConversation}
            >
              <X className="h-3 w-3 mr-1" /> Clear Chat
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[240px] mb-4 rounded-md border border-white/10 p-4 bg-black/20 backdrop-blur-sm">
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
                      ? 'bg-findvenue/20 ml-8 border border-findvenue/30' 
                      : 'bg-gray-700/30 mr-8 border border-white/5'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 
                    ${item.isUser ? 'bg-findvenue/30 text-white' : 'bg-gray-700 text-white'}`}>
                    {item.isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
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
      </CardContent>
      
      <CardFooter className="border-t border-white/10 pt-4 flex flex-col space-y-2">
        {isSpeaking && (
          <div className="text-center w-full py-2 px-4 bg-blue-600/20 rounded-md text-sm border border-dashed border-blue-500/50 flex items-center justify-center">
            <Volume2 className="h-3 w-3 mr-2 text-blue-500 animate-pulse" />
            <span>Speaking... </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 py-0 px-2 text-xs border border-blue-500/30 hover:bg-blue-500/20"
              onClick={handleStopSpeaking}
            >
              <StopCircle className="h-3 w-3 mr-1 text-blue-300" /> Stop
            </Button>
          </div>
        )}
        
        {isListening && (
          <div className="text-center w-full py-2 px-4 bg-green-600/20 rounded-md text-sm border border-dashed border-green-500/50 animate-pulse flex items-center justify-center">
            <Mic className="h-3 w-3 mr-2 text-green-500" />
            <span>Listening...</span> 
            {transcript && <span className="font-medium ml-1">"<span className="text-green-400">{transcript}</span>"</span>}
          </div>
        )}
        
        {isProcessing && (
          <div className="text-center w-full py-2 px-4 bg-blue-600/10 rounded-md text-sm border border-dashed border-blue-500/30 flex items-center justify-center">
            <Loader2 className="h-3 w-3 inline-block mr-2 animate-spin text-blue-500" />
            <span>Processing your request...</span>
          </div>
        )}
        
        {!isListening && !isProcessing && !isSpeaking && (
          <div className="text-center text-sm text-findvenue-text-muted">
            Ask anything about <span className="text-findvenue font-medium">{venue.name}</span> - click the mic to start
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default VenueSpecificVoiceAssistant;
