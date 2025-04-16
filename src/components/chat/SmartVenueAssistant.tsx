
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, X, Mic, MicOff, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interface for structured venue data
interface VenueLink {
  id: string;
  name: string;
  type: string;
  cityName: string;
  description?: string;
}

interface VoiceState {
  isListening: boolean;
  isProcessingVoice: boolean;
  transcript: string;
  isSpeaking: boolean;
  audioEnabled: boolean;
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  venueLinks?: VenueLink[];
  timestamp: Date;
};

const SmartVenueAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '0', 
      role: 'assistant', 
      content: "Hello! I'm your AI venue assistant. Ask me anything about venues, event spaces, or find the perfect location for your next gathering!", 
      timestamp: new Date() 
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice assistant state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessingVoice: false,
    transcript: '',
    isSpeaking: false,
    audioEnabled: true
  });
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      stopListening();
    };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setVoiceState(prev => ({ ...prev, isListening: true }));
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        
        setVoiceState(prev => ({ ...prev, transcript }));
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setVoiceState(prev => ({ ...prev, isListening: false }));
        toast.error(`Speech recognition error: ${event.error}`);
      };
      
      recognitionRef.current.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };
    } else {
      toast.error('Speech recognition is not supported in this browser.');
    }
  };
  
  const startListening = async () => {
    try {
      if (!recognitionRef.current) {
        initSpeechRecognition();
      }
      
      if (recognitionRef.current) {
        await recognitionRef.current.start();
        toast.success('Listening... Speak now');
      }
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      toast.error('Could not access microphone. Please ensure you have granted the necessary permissions.');
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
    }
    
    // If transcript has content, send it as a message
    if (voiceState.transcript.trim()) {
      handleSendMessage(null, voiceState.transcript);
      // Reset transcript
      setVoiceState(prev => ({ ...prev, transcript: '' }));
    }
  };
  
  const toggleListening = () => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  const toggleAudio = () => {
    setVoiceState(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }));
    
    if (voiceState.audioEnabled && voiceState.isSpeaking) {
      stopSpeaking();
    }
  };
  
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    }
  };
  
  const speakText = async (text: string) => {
    if (!text || !voiceState.audioEnabled) return;
    
    try {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });
      
      if (error) throw new Error(error.message);
      
      if (!data?.audio) throw new Error('No audio received from TTS service');
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      const audio = audioRef.current || new Audio();
      audio.src = `data:audio/mp3;base64,${data.audio}`;
      
      audio.onended = () => {
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      };
      
      audio.onerror = () => {
        console.error('Audio playback error');
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      };
      
      await audio.play();
    } catch (err: any) {
      console.error('Text-to-speech error:', err);
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      toast.error('Failed to play audio response');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, voiceMessage?: string) => {
    if (e) e.preventDefault();
    
    const userMessage = voiceMessage || message;
    if (!userMessage.trim() || isLoading) return;
    
    // Reset the input field
    setMessage('');
    
    // Generate a unique ID for the message
    const messageId = Date.now().toString();
    
    // Add user message to the chat
    setMessages(prev => [...prev, { 
      id: messageId, 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date() 
    }]);
    
    // Process the user query
    setIsLoading(true);
    
    try {
      // Call the Edge Function to process the query
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: userMessage,
          type: 'chat'
        }
      });
      
      if (error) {
        throw new Error(`Error calling venue-assistant: ${error.message}`);
      }
      
      // Extract venue links if they are included in the response
      let venueLinks: VenueLink[] | undefined;
      if (data?.venues && Array.isArray(data.venues) && data.venues.length > 0) {
        venueLinks = data.venues.map(venue => ({
          id: venue.id,
          name: venue.name,
          type: venue.type || 'Venue',
          cityName: venue.city_name || 'Unknown location',
          description: venue.description
        }));
      }
      
      // Add AI response to chat
      const assistantResponse = { 
        id: `${messageId}-response`, 
        role: 'assistant' as const, 
        content: data?.answer || "I'm sorry, I couldn't process your request at this time.", 
        venueLinks,
        timestamp: new Date() 
      };
      
      setMessages(prev => [...prev, assistantResponse]);
      
      // If audio is enabled, speak the response
      if (voiceState.audioEnabled) {
        await speakText(assistantResponse.content);
      }
    } catch (error) {
      console.error('Error processing query:', error);
      
      toast.error('Failed to get a response', {
        description: 'Please try again in a moment',
      });
      
      setMessages(prev => [...prev, { 
        id: `${messageId}-error`, 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg p-0 border border-blue-500/20"
                aria-label="Open venue assistant"
              >
                <MessageSquare size={24} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
              <p>Ask about venues</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-lg border border-white/10 glass-card flex flex-col">
          <CardHeader className="bg-findvenue p-3 flex justify-between items-center rounded-t-lg">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="FindVenue Assistant" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <span className="font-medium text-white">FindVenue Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleAudio} 
                className="text-white hover:bg-findvenue-dark h-8 w-8"
              >
                {voiceState.audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:bg-findvenue-dark h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-3">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-findvenue text-white'
                        : 'bg-findvenue-surface/30 border border-white/10'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    
                    {/* Render venue links if available */}
                    {msg.venueLinks && msg.venueLinks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium opacity-80">Suggested Venues:</p>
                        <div className="space-y-2">
                          {msg.venueLinks.map((venue) => (
                            <Link 
                              key={venue.id} 
                              to={`/venue/${venue.id}`}
                              className="flex items-center p-2 rounded-md bg-blue-500/20 border border-blue-400/30 hover:bg-blue-500/30 transition"
                            >
                              <ExternalLink size={14} className="mr-2" />
                              <div>
                                <p className="text-sm font-medium">{venue.name}</p>
                                <p className="text-xs opacity-80">{venue.type} • {venue.cityName}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-findvenue-surface/30 border border-white/10">
                    <Loader2 className="h-5 w-5 animate-spin text-findvenue" />
                  </div>
                </div>
              )}
              {voiceState.isListening && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-findvenue-surface/30 border border-white/10">
                    <div className="flex items-center">
                      <Mic className="h-5 w-5 mr-2 text-findvenue animate-pulse" />
                      <span>{voiceState.transcript || "Listening..."}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          <CardFooter className="p-3 pt-0">
            <form onSubmit={handleSendMessage} className="w-full flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="bg-findvenue hover:bg-findvenue-dark" 
                disabled={!message.trim() || isLoading || voiceState.isListening}
              >
                <Send size={18} />
              </Button>
              <Button
                type="button"
                size="icon"
                className={`${voiceState.isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                onClick={toggleListening}
                disabled={isLoading}
              >
                {voiceState.isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default SmartVenueAssistant;
