
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Send, User, Bot, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    audioElementRef.current = new Audio();
    audioElementRef.current.onplay = () => setIsSpeaking(true);
    audioElementRef.current.onended = () => setIsSpeaking(false);
    audioElementRef.current.onerror = () => setIsSpeaking(false);
    
    // Check for microphone permissions
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setMicPermission(true))
      .catch(() => setMicPermission(false));
      
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
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

  // Chat integration
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
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = `data:audio/mp3;base64,${data.audio}`;
        await audioElementRef.current.play();
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
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
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

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  if (!venue) {
    return (
      <Card className="bg-gradient-to-b from-slate-950 to-slate-900 border-none shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse flex flex-col items-center">
              <Bot className="h-12 w-12 text-blue-500 mb-4" />
              <p className="text-gray-400">Loading venue information...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      {/* Header */}
      <div className="p-6 pb-4 bg-gradient-to-r from-blue-800 to-blue-900 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-700 rounded-full flex items-center justify-center border border-blue-500/30 shadow-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-lg text-white">Venue Assistant</h2>
            <p className="text-xs text-blue-200">Ask anything about {venue.name}</p>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAudio}
                className={`rounded-full w-8 h-8 p-0 ${
                  audioEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 
                  'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white border-slate-700">
              {audioEnabled ? "Disable voice responses" : "Enable voice responses"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden p-6 pt-3">
        <div className="flex justify-end mb-3">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs hover:bg-red-500/10 text-red-400"
            onClick={handleClearConversation}
          >
            Clear history
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100%-40px)] pr-2">
          {unifiedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center animate-pulse">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-300 font-medium">How can I help you with {venue.name}?</p>
                <p className="text-xs text-gray-500">Ask about amenities, pricing, or booking details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {unifiedMessages.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex gap-3 ${item.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!item.isUser && (
                    <div className="w-8 h-8 rounded-full bg-blue-700 flex-shrink-0 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-[75%] rounded-2xl p-4 ${
                      item.isUser 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-4' 
                        : 'bg-slate-800/80 border border-slate-700/50'
                    }`}
                  >
                    <p className="text-sm">{item.text}</p>
                    <span className="text-xs block mt-1 opacity-70">
                      {item.mode === 'voice' ? '🎙️ Voice' : '✍️ Text'}
                    </span>
                  </div>
                  
                  {item.isUser && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Status Indicators */}
      <div className="px-6">
        {isSpeaking && (
          <div className="text-center w-full p-2 mb-2 bg-blue-900/30 rounded-lg text-sm border border-blue-800/50 flex items-center justify-center">
            <Volume2 className="h-3 w-3 mr-2 text-blue-400 animate-pulse" />
            <span className="text-blue-300">Speaking...</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 py-0 px-2 text-xs text-blue-300 hover:bg-blue-800/30"
              onClick={handleStopSpeaking}
            >
              Stop
            </Button>
          </div>
        )}
        
        {isListening && (
          <div className="text-center w-full p-2 mb-2 bg-green-900/30 rounded-lg text-sm border border-green-800/50 animate-pulse flex items-center justify-center">
            <Mic className="h-3 w-3 mr-2 text-green-400" />
            <span className="text-green-300">Listening...</span> 
            {transcript && <span className="ml-1 text-green-300">"{transcript}"</span>}
          </div>
        )}
        
        {(voiceIsProcessing || chatIsLoading) && (
          <div className="text-center w-full p-2 mb-2 bg-slate-800/50 rounded-lg text-sm border border-slate-700/50 flex items-center justify-center">
            <Loader2 className="h-3 w-3 inline-block mr-2 animate-spin text-slate-400" />
            <span className="text-slate-300">Processing your request...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <CardFooter className="p-4 border-t border-slate-800 bg-slate-900/50">
        <form onSubmit={handleTextSubmit} className="flex gap-2 w-full">
          <Input
            placeholder="Type your message..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 bg-slate-800 border-slate-700 focus:border-blue-700 text-white placeholder-gray-400"
            disabled={isListening || voiceIsProcessing || chatIsLoading}
          />
          
          <Button 
            type="submit" 
            disabled={!textInput.trim() || isListening || voiceIsProcessing || chatIsLoading}
            className="bg-blue-700 hover:bg-blue-800"
          >
            <Send className="h-4 w-4" />
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={voiceIsProcessing || chatIsLoading}
                  className={isListening ? 
                    "bg-red-600 hover:bg-red-700" : 
                    "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  }
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                {isListening ? "Stop listening" : "Start voice input"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </CardFooter>
    </div>
  );
};

export default VenueUnifiedChatAssistant;
