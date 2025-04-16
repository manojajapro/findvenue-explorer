
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, X, Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Venue } from '@/hooks/useSupabaseVenues';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  venues?: Venue[];
};

const SmartVenueAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m FindVenue Assistant. Ask me about venues, locations, features, or anything venue-related!' }
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialize audio element for text-to-speech
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.onplay = () => setIsSpeaking(true);
    audioElementRef.current.onended = () => setIsSpeaking(false);
    audioElementRef.current.onerror = () => setIsSpeaking(false);
    
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setMessage(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Error",
          description: "Speech recognition error. Please try again.",
          variant: "destructive",
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
    }
  };

  // Start voice input
  const startListening = async () => {
    if (!recognitionRef.current) {
      initSpeechRecognition();
    }
    
    try {
      if (recognitionRef.current) {
        await recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop voice input
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      handleSendMessage();
    }
  };

  // Toggle voice response
  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    
    if (isSpeaking && audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsSpeaking(false);
    }

    toast({
      title: audioEnabled ? "Voice responses disabled" : "Voice responses enabled",
      description: audioEnabled ? "Assistant will now respond with text only" : "Assistant will now speak responses",
    });
  };

  // Text-to-speech function
  const speakText = async (text: string): Promise<void> => {
    if (!text || !audioEnabled) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Sarah voice
        }
      });
      
      if (error) throw new Error(error.message);
      if (!data?.audio) throw new Error('No audio received from TTS service');
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.src = `data:audio/mp3;base64,${data.audio}`;
        await audioElementRef.current.play();
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Audio Error",
        description: "Failed to play voice response",
        variant: "destructive",
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to assistant
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    const userMessage = message;
    setMessage('');
    setIsLoading(true);
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Call AI assistant edge function
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: userMessage,
          type: 'home'
        }
      });
      
      if (error) throw new Error(error.message);
      
      // Add assistant response to chat
      if (data?.answer) {
        const newMessage: Message = { 
          role: 'assistant', 
          content: data.answer 
        };
        
        // Add venues if available
        if (data.venues && Array.isArray(data.venues)) {
          newMessage.venues = data.venues;
        }
        
        setMessages(prev => [...prev, newMessage]);
        
        // Play audio response if enabled
        if (audioEnabled) {
          await speakText(data.answer);
        }
      }
    } catch (error) {
      console.error('Error in assistant call:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      }]);
      
      toast({
        title: "Error",
        description: "Failed to get a response from the assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to venue details
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
    setIsOpen(false);
  };
  
  // Clear chat history
  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Hi! I\'m FindVenue Assistant. Ask me about venues, locations, features, or anything venue-related!' }]);
    toast({
      title: "Chat cleared",
      description: "Chat history has been cleared",
    });
  };

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-blue-600 hover:bg-blue-700 shadow-lg p-0 z-50"
        >
          <MessageSquare size={24} />
        </Button>
      )}
      
      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-lg border border-blue-100 dark:border-blue-900 flex flex-col z-50">
          <CardHeader className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center rounded-t-lg">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="FindVenue Assistant" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <span className="font-medium">FindVenue Assistant</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={toggleAudio} className="text-white hover:bg-blue-700 h-8 w-8">
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </Button>
              <Button variant="ghost" size="icon" onClick={clearChat} className="text-white hover:bg-blue-700 h-8 w-8">
                <X size={16} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-blue-700 h-8 w-8">
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-3">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      {msg.content}
                      
                      {/* Venue recommendations */}
                      {msg.venues && msg.venues.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            Recommended Venues
                          </Badge>
                          
                          <div className="space-y-2 mt-2">
                            {msg.venues.slice(0, 3).map(venue => (
                              <div 
                                key={venue.id}
                                onClick={() => handleVenueClick(venue.id)}
                                className="p-2 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 dark:bg-slate-800 mr-2">
                                    <img 
                                      src={venue.imageUrl || '/placeholder.svg'} 
                                      alt={venue.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium line-clamp-1">{venue.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                      {venue.city || venue.address}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {msg.venues.length > 3 && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => navigate('/venues')}>
                                + {msg.venues.length - 3} more venues
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="p-3 pt-2 border-t">
            <form onSubmit={handleSendMessage} className="w-full flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about venues..."
                  className="pr-8"
                  disabled={isLoading || isListening}
                />
                
                <Button 
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={isListening ? stopListening : startListening}
                  className="absolute right-1 top-1 h-8 w-8"
                  disabled={isLoading}
                >
                  {isListening ? (
                    <MicOff size={16} className="text-red-500" />
                  ) : (
                    <Mic size={16} />
                  )}
                </Button>
              </div>
              
              <Button 
                type="submit" 
                size="icon" 
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10"
                disabled={!message.trim() || isLoading || isListening}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
      
      {/* Voice status indicators */}
      {isListening && (
        <div className="fixed bottom-24 right-6 bg-red-600 text-white px-3 py-1 rounded-lg text-sm shadow-md animate-pulse z-50">
          Listening...
        </div>
      )}
      
      {isSpeaking && (
        <div className="fixed bottom-24 right-6 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm shadow-md z-50">
          Speaking...
        </div>
      )}
    </>
  );
};

export default SmartVenueAssistant;
