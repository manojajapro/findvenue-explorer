
import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Send, X, User, Bot, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VenueUnifiedChatAssistantProps {
  venue: Venue | null;
  onClose?: () => void;
}

const VenueUnifiedChatAssistant = ({ venue, onClose }: VenueUnifiedChatAssistantProps) => {
  const [textInput, setTextInput] = useState<string>('');
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [unifiedMessages, setUnifiedMessages] = useState<Array<{ text: string; isUser: boolean; mode: 'text' | 'voice' }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onplay = () => setIsSpeaking(true);
    audioRef.current.onended = () => setIsSpeaking(false);
    audioRef.current.onerror = () => setIsSpeaking(false);
    
    // Check for microphone permissions
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setMicPermission(true))
      .catch(() => setMicPermission(false));
      
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Voice assistant integration
  const { 
    isListening,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    isProcessing: voiceIsProcessing,
    audioEnabled,
    toggleAudio,
    error: voiceError
  } = useVenueVoiceAssistant({
    venue,
    autoRestart: false,
    onTranscript: (text) => {
      // We'll handle this in the component
    },
    onAnswer: (response) => {
      // Add the assistant's response to unified messages
      setUnifiedMessages(prev => [...prev, { text: response, isUser: false, mode: 'voice' }]);
      
      // Audio is handled in the hook
    },
    onSpeechStart: () => {
      setIsSpeaking(true);
    },
    onSpeechEnd: () => {
      setIsSpeaking(false);
    }
  });

  // Chat integration - use the correctly named hook
  const {
    submitMessage,
    isLoading: chatIsLoading,
  } = useChatWithVenue();

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [unifiedMessages]);

  // Handle microphone permission request
  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission(true);
      return true;
    } catch (err) {
      toast.error('Microphone permission denied', {
        description: 'Please enable microphone access in your browser settings.'
      });
      setMicPermission(false);
      return false;
    }
  };

  // Handle voice input toggle
  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
      
      // If we have a transcript, add it to messages and process it
      if (transcript) {
        const trimmedTranscript = transcript.trim();
        if (trimmedTranscript) {
          setUnifiedMessages(prev => [...prev, { text: trimmedTranscript, isUser: true, mode: 'voice' }]);
          
          // Process through AI
          await processAIRequest(trimmedTranscript);
        }
      }
    } else {
      // Request permission if needed
      const hasPermission = micPermission || await requestMicrophonePermission();
      
      if (hasPermission) {
        await startListening();
        toast.success('Listening...', {
          description: 'Speak clearly into your microphone.'
        });
      }
    }
  };

  // Process request through AI
  const processAIRequest = async (message: string) => {
    if (!venue) return;
    
    try {
      // Call the venue assistant API
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: message,
          venueId: venue.id,
          type: 'chat'
        }
      });
      
      if (error) throw error;
      
      const assistantResponse = data.answer || "I'm sorry, I couldn't process your request at this time.";
      setUnifiedMessages(prev => [...prev, { text: assistantResponse, isUser: false, mode: 'text' }]);
      
      // Convert to speech if audio is enabled
      if (audioEnabled) {
        await speakText(assistantResponse);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      
      toast.error('Failed to get a response', {
        description: 'Please try again in a moment',
      });
      
      setUnifiedMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false, 
        mode: 'text'
      }]);
    }
    
    setTextInput('');
  };

  // Handle text input submission
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const message = textInput.trim();
    if (!message) return;
    
    setUnifiedMessages(prev => [...prev, { text: message, isUser: true, mode: 'text' }]);
    await processAIRequest(message);
  };

  // Convert text to speech
  const speakText = async (text: string): Promise<void> => {
    if (!text || !audioEnabled) return;
    
    setIsSpeaking(true);
    
    try {
      // Call our Edge Function for ElevenLabs TTS
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Sarah voice by default
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (!data?.audio) throw new Error('No audio received from TTS service');
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = `data:audio/mp3;base64,${data.audio}`;
        await audioRef.current.play();
      }
    } catch (err: any) {
      console.error('Text-to-speech error:', err);
      setIsSpeaking(false);
      toast.error('Failed to play audio response');
    }
  };
  
  // Stop speaking
  const handleStopSpeaking = () => {
    stopSpeaking();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // Clear conversation history
  const handleClearConversation = () => {
    setUnifiedMessages([]);
    toast.success('Conversation cleared', {
      description: 'Your chat history has been cleared.'
    });
  };

  if (!venue) {
    return (
      <Card className="bg-black/80 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle>Venue Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Venue information is loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/80 backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Chat with Venue Assistant</CardTitle>
            {audioEnabled && (
              <Badge variant="outline" className="bg-green-500/20 text-green-500">
                Voice Enabled
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`${audioEnabled ? 'border-green-500 text-green-500' : 'border-white/10'}`}
              onClick={toggleAudio}
              title={audioEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="border-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs hover:bg-red-500/10 text-red-400"
            onClick={handleClearConversation}
          >
            <X className="h-3 w-3 mr-1" /> Clear Chat
          </Button>
        </div>
        
        <ScrollArea className="h-[300px] mb-4 rounded-md border border-white/10 p-3 bg-black/40 backdrop-blur-sm">
          {unifiedMessages.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>Ask anything about {venue.name}</p>
              <p className="text-xs mt-2">Type a message or click the microphone to start speaking</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unifiedMessages.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex gap-2 p-2 rounded-lg text-sm ${
                    item.isUser 
                      ? 'bg-blue-900/30 ml-8 border border-blue-700/30' 
                      : 'bg-gray-800/30 mr-8 border border-white/5'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 
                    ${item.isUser ? 'bg-blue-700/50' : 'bg-gray-700'}`}>
                    {item.isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t border-white/10 pt-3 px-4 pb-4 flex flex-col space-y-2">
        {isSpeaking && (
          <div className="text-center w-full py-2 px-3 bg-blue-600/20 rounded-md text-sm border border-dashed border-blue-500/50 flex items-center justify-center">
            <Volume2 className="h-3 w-3 mr-2 text-blue-500 animate-pulse" />
            <span>Speaking... </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 py-0 px-2 text-xs border border-blue-500/30 hover:bg-blue-500/20"
              onClick={handleStopSpeaking}
            >
              <X className="h-3 w-3 mr-1 text-blue-300" /> Stop
            </Button>
          </div>
        )}
        
        {isListening && (
          <div className="text-center w-full py-2 px-3 bg-green-600/20 rounded-md text-sm border border-dashed border-green-500/50 animate-pulse flex items-center justify-center">
            <Mic className="h-3 w-3 mr-2 text-green-500" />
            <span>Listening...</span> 
            {transcript && <span className="font-medium ml-1">"<span className="text-green-400">{transcript}</span>"</span>}
          </div>
        )}
        
        {(voiceIsProcessing || chatIsLoading) && (
          <div className="text-center w-full py-2 px-3 bg-blue-600/10 rounded-md text-sm border border-dashed border-blue-500/30 flex items-center justify-center">
            <Loader2 className="h-3 w-3 inline-block mr-2 animate-spin text-blue-500" />
            <span>Processing your request...</span>
          </div>
        )}

        <form onSubmit={handleTextSubmit} className="flex gap-2 w-full mt-2">
          <Input
            placeholder="Type your message..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 bg-gray-900/50 border-gray-700"
            disabled={isListening || voiceIsProcessing || chatIsLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!textInput.trim() || isListening || voiceIsProcessing || chatIsLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleVoiceToggle}
            disabled={voiceIsProcessing || chatIsLoading}
            className={isListening ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default VenueUnifiedChatAssistant;
