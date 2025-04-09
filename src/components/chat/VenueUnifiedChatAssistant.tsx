
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, User, Bot, Volume2, VolumeX, Loader2, Building } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

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
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Start with voice disabled by default
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [speechPaused, setSpeechPaused] = useState<boolean>(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
      
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
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
    toggleAudio,
    error: voiceError
  } = useVenueVoiceAssistant({
    venue,
    autoRestart: false,
    onTranscript: (text) => {
      // Update input field with recognized text in real-time
      setTextInput(text);
      
      // Reset the pause timeout
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      
      // Set a new timeout for speech pause detection
      pauseTimeoutRef.current = setTimeout(() => {
        setSpeechPaused(true);
        if (text.trim().length > 0) {
          console.log("Speech paused, auto-submitting:", text);
          // Auto-submit when speech pauses
          setIsRecognizing(false);
          handleTextSubmit(new Event('submit') as unknown as React.FormEvent);
        }
      }, 1500); // 1.5 seconds of silence is considered a pause
    },
    onAnswer: (response) => {
      // Add the assistant's response to unified messages
      setUnifiedMessages(prev => [...prev, { text: response, isUser: false, mode: 'voice' }]);
    },
    onSpeechStart: () => {
      if (audioEnabled) {
        setIsSpeaking(true);
      }
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

  // Auto-submit when speech recognition is complete and has valid text
  useEffect(() => {
    if (!isListening && isRecognizing && textInput.trim().length > 0) {
      console.log("Speech recognition stopped, auto-submitting:", textInput);
      // When recognition stops and we have text, auto-submit
      handleTextSubmit(new Event('submit') as unknown as React.FormEvent);
      setIsRecognizing(false);
    }
  }, [isListening, textInput, isRecognizing]);

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
      // Processing will be handled by the useEffect that monitors isListening changes
    } else {
      // Request permission if needed
      const hasPermission = micPermission || await requestMicrophonePermission();
      
      if (hasPermission) {
        // Clear the input field before starting new recognition
        setTextInput('');
        setSpeechPaused(false);
        setIsRecognizing(true);
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
      
      // Convert to speech only if audio is enabled
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
    
    setUnifiedMessages(prev => [...prev, { text: message, isUser: true, mode: isRecognizing ? 'voice' : 'text' }]);
    
    // Stop listening if we're currently recognizing speech
    if (isListening) {
      stopListening();
    }
    
    await processAIRequest(message);
    setTextInput('');
    setSpeechPaused(false);
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

  // Toggle audio responses
  const handleAudioToggle = () => {
    setAudioEnabled(prev => !prev);
    
    // If turning off audio while speaking, stop it
    if (audioEnabled && isSpeaking) {
      handleStopSpeaking();
    }
    
    toast.success(
      audioEnabled ? 'Voice responses disabled' : 'Voice responses enabled', 
      { 
        description: audioEnabled ? 'Assistant will respond with text only' : 'Assistant will speak responses aloud'
      }
    );
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
      <div className="p-6 pb-4 bg-gradient-to-r from-blue-800 to-indigo-800 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-700 rounded-full flex items-center justify-center border border-blue-500/30 shadow-lg">
            <Building className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-lg text-white">Venue Assistant</h2>
            <p className="text-xs text-blue-200">Ask anything about {venue.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200">Voice</span>
            <Switch
              checked={audioEnabled}
              onCheckedChange={handleAudioToggle}
              className={`${
                audioEnabled ? 'bg-green-600' : 'bg-slate-700'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden p-6 pt-3 bg-slate-900">
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
                        : 'bg-slate-800/80 border border-slate-700/50 text-white'
                    }`}
                  >
                    <p className="text-sm">{item.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs block opacity-70">
                        {item.mode === 'voice' ? '🎙️ Voice' : '✍️ Text'}
                      </span>
                      
                      {!item.isUser && audioEnabled && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                          onClick={() => speakText(item.text)}
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
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
      <div className="px-6 bg-slate-900">
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
      <CardFooter className="p-4 border-t border-slate-800 bg-slate-900/90 rounded-b-lg">
        <form onSubmit={handleTextSubmit} className="flex gap-2 w-full">
          <Input
            ref={inputRef}
            placeholder={isListening ? "Listening to your voice..." : "Type your message..."}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className={`flex-1 bg-slate-800 border-slate-700 focus:border-blue-700 text-white placeholder-gray-400 ${isListening ? 'border-green-500/50' : ''}`}
            disabled={voiceIsProcessing || chatIsLoading}
          />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  disabled={!textInput.trim() || isListening || voiceIsProcessing || chatIsLoading}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                Send message
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
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
