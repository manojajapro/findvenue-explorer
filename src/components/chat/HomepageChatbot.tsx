import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Venue } from '@/hooks/useSupabaseVenues';
import { Volume2, Mic } from "lucide-react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
};

type ChatbotState = 'idle' | 'thinking' | 'error';

const HomepageChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      sender: 'bot',
      content: "Hello! I'm your venue assistant. I can help you find the perfect venue for your event. What type of venue are you looking for?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatbotState, setChatbotState] = useState<ChatbotState>('idle');
  const [suggestedVenues, setSuggestedVenues] = useState<Venue[]>([]);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [lastBotShouldSpeak, setLastBotShouldSpeak] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { speak, stop, isSupported: speechSynthesisSupported } = useSpeechSynthesis();
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const { startListening, stopListening, isSupported: speechRecognitionSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setInputMessage(transcript);
      setIsListening(false);
      if (transcript) {
        handleSendMessage(transcript);
      }
    },
    onEnd: () => setIsListening(false),
    onError: (err) => {
      setIsListening(false);
      setIsVoiceAvailable(false);
      toast({
        title: "Speech Recognition Error",
        description: "Speech recognition not supported or not permitted in your browser."
      });
    }
  });

  useEffect(() => {
    setIsVoiceAvailable(speechRecognitionSupported === true);
  }, [speechRecognitionSupported]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  const handleSendMessage = async (customMessage?: string, options?: { viaMic?: boolean }) => {
    const messageText = customMessage || inputMessage;
    
    if (messageText.trim() === '' || chatbotState === 'thinking') return;

    const userMessage = {
      id: generateId(),
      sender: 'user' as const,
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setChatbotState('thinking');

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out")), 30000)
      );
      const responsePromise = supabase.functions.invoke('venue-chatbot', {
        body: { query: messageText, ...(options?.viaMic ? { viaMic: true } : {}) }
      });
      const response = await Promise.race([responsePromise, timeoutPromise]);
      if (response.error) throw new Error(response.error.message || 'Error from chatbot service');
      if (!response.data) throw new Error('Invalid response format from chatbot service');
      
      const { message, venues, error, speak } = response.data;
      if (error) console.error('Error from chatbot API:', error);

      const botMessage = {
        id: generateId(),
        sender: 'bot' as const,
        content: message || "I'm sorry, I couldn't process your request.",
        timestamp: new Date()
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);
      setLastBotShouldSpeak(!!speak);

      if (venues && Array.isArray(venues) && venues.length > 0) {
        setSuggestedVenues(venues);
      } else {
        setSuggestedVenues([]);
      }
      
      setChatbotState('idle');
    } catch (error: any) {
      console.error('Error calling chatbot:', error);
      
      const errorMessage = {
        id: generateId(),
        sender: 'bot' as const,
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        timestamp: new Date()
      };

      setMessages(prevMessages => [...prevMessages, errorMessage]);
      setChatbotState('error');
      
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not connect to the chatbot service. Please try again later."
      });
      
      setTimeout(() => setChatbotState('idle'), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const viewVenueDetails = (venueId: string) => {
    navigate(`/venue/${venueId}`);
    setIsOpen(false);
  };

  const handleSpeak = (text: string) => {
    if (!speechSynthesisSupported) {
      toast({
        title: "Speech Synthesis Not Available",
        description: "Your browser does not support speech synthesis."
      });
      return;
    }
    
    stop();
    speak(
      text, 
      () => setIsSpeaking(true), 
      () => setIsSpeaking(false)
    );
  };

  const handleStartListening = () => {
    if (!speechRecognitionSupported) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser does not support speech recognition."
      });
      return;
    }
    
    setIsListening(true);
    startListening().catch(() => {
      setIsListening(false);
      setIsVoiceAvailable(false);
      
      toast({
        title: "Microphone Access",
        description: "Please allow microphone access to use voice features."
      });
    });
  };

  const handleStopListening = () => {
    setIsListening(false);
    stopListening();
  };

  const micSendHandler = (transcript: string) => {
    setInputMessage(transcript);
    setIsListening(false);
    if (transcript) {
      handleSendMessage(transcript, { viaMic: true });
    }
  };

  useEffect(() => {
    if (
      lastBotShouldSpeak &&
      speechSynthesisSupported &&
      messages.length &&
      messages[messages.length - 1]?.sender === 'bot'
    ) {
      handleSpeak(messages[messages.length - 1].content);
      setLastBotShouldSpeak(false);
    }
  }, [messages, lastBotShouldSpeak, speechSynthesisSupported]);

  const getVenueMainImage = (venue: any) => {
    if (venue.gallery_images && Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) {
      return venue.gallery_images[0];
    }
    return '/placeholder.svg';
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed right-4 bottom-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="Venue Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
            <p>Chat with Venue Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[560px] h-[600px] p-0 overflow-hidden right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl flex flex-col"
        >
          <DialogTitle className="sr-only">Venue Assistant</DialogTitle>
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 p-4 border-b border-white/10">
            <Bot className="h-5 w-5 text-findvenue" />
            <h2 className="text-white font-medium">Venue Assistant</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-findvenue-card-bg border border-findvenue-border'
                  }`}>
                    {message.sender === 'user' 
                      ? <User className="h-4 w-4" /> 
                      : <Bot className="h-4 w-4" />
                    }
                  </div>
                  <div className={`rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-findvenue text-white'
                      : 'bg-findvenue-card-bg border border-findvenue-border flex items-center gap-2'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.sender === "bot" && speechSynthesisSupported && (
                      <Button size="icon" variant="ghost" onClick={() => handleSpeak(message.content)} className="ml-1 h-7 w-7 flex-shrink-0">
                        <Volume2 className="h-4 w-4 text-findvenue cursor-pointer" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {chatbotState === 'thinking' && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-findvenue-card-bg border border-findvenue-border">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-findvenue-card-bg border border-findvenue-border rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-findvenue animate-pulse"></span>
                      <span className="w-2 h-2 rounded-full bg-findvenue animate-pulse delay-100"></span>
                      <span className="w-2 h-2 rounded-full bg-findvenue animate-pulse delay-200"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {suggestedVenues.length > 0 && (
              <div className="space-y-2">
                <Badge variant="outline" className="bg-findvenue/10 text-findvenue mb-2">
                  Matching Venues
                </Badge>
                <div className="space-y-3">
                  {suggestedVenues.map((venue) => (
                    <Card 
                      key={venue.id}
                      className="bg-findvenue-card-bg border border-findvenue-border p-3 cursor-pointer hover:bg-findvenue-surface/50 transition"
                      onClick={() => viewVenueDetails(venue.id)}
                    >
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-shrink-0 relative w-full sm:w-24 h-24">
                          <img
                            src={getVenueMainImage(venue)}
                            alt={venue.name}
                            className="rounded object-cover w-full h-full"
                          />
                          {venue.featured && (
                            <span className="absolute top-0 right-0 bg-yellow-400 text-xs text-black px-1 rounded-tr rounded-bl">★</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-md font-semibold text-white truncate">{venue.name}</h4>
                          <div className="text-xs text-findvenue-text-muted flex flex-wrap gap-2">
                            <span>{venue.city_name || venue.city || 'No city'}</span>
                            <span>|</span>
                            <span className="capitalize">{Array.isArray(venue.category_name) ? venue.category_name.join(', ') : (venue.category_name || venue.category)}</span>
                            <span>|</span>
                            <span>Type: {venue.type ?? 'Venue'}</span>
                          </div>
                          <div className="text-xs mt-1 flex flex-wrap gap-3">
                            <span>
                              <b>Capacity:</b> {venue.min_capacity ?? venue.capacity?.min ?? '-'} - {venue.max_capacity ?? venue.capacity?.max ?? '-'}
                            </span>
                            <span>
                              <b>Price:</b> {venue.starting_price ?? venue.pricing?.startingPrice ?? '-'} {venue.currency ?? venue.pricing?.currency ?? 'SAR'}
                              {venue.price_per_person || venue.pricing?.pricePerPerson ? ' per person' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-white/80 mt-1 line-clamp-3">{venue.description ?? '-'}</p>
                          {venue.amenities && (
                            <p className="text-[11px] text-findvenue mb-0 mt-1 truncate">
                              <b>Amenities:</b> {Array.isArray(venue.amenities) ? venue.amenities.join(', ') : venue.amenities}
                            </p>
                          )}
                          <p className="text-[11px] text-findvenue-text-muted mt-1 line-clamp-1">
                            <b>Address:</b> {venue.address}
                          </p>
                          {venue.rating && (
                            <span className="inline-block bg-green-800 text-xs px-2 py-0.5 rounded mt-1">★ {venue.rating} / 5</span>
                          )}
                          <div className="flex gap-2 flex-wrap mt-2">
                            {venue.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                            {venue.featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                            {venue.reviews_count && (
                              <span className="text-xs text-white/70">
                                {venue.reviews_count} reviews
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 items-center">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your question or use the mic..."
                className="bg-findvenue-surface/50 border-white/10"
                onKeyDown={handleKeyDown}
                disabled={chatbotState === 'thinking' || isListening}
                aria-label="Chat message input"
              />
              <Button 
                onClick={() => handleSendMessage()}
                disabled={inputMessage.trim() === '' || chatbotState === 'thinking'}
                className="bg-findvenue hover:bg-findvenue-dark"
                aria-label="Send"
              >
                {chatbotState === 'thinking' ? (
                  <div className="h-4 w-4 border-2 border-r-transparent border-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              {speechRecognitionSupported !== false && (
                <Button
                  onClick={isListening ? handleStopListening : handleStartListening}
                  className={`ml-1 ${isListening ? 'bg-findvenue' : 'bg-findvenue-surface/80'} border border-findvenue/30 hover:bg-findvenue/20 transition duration-150 ${isListening ? "animate-pulse" : ""}`}
                  disabled={chatbotState === 'thinking'}
                  size="icon"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-findvenue-text-muted mt-2">
              Ask me about venues, events, pricing, or locations!
              {speechRecognitionSupported === false && (
                <span className="text-yellow-500 ml-2">Voice features not supported in your browser.</span>
              )}
            </p>
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                <Mic className="w-4 h-4 animate-pulse" />
                Listening... Speak now!
                <Button variant="outline" size="sm" className="ml-2 py-0 px-2" onClick={handleStopListening}>Stop</Button>
              </div>
            )}
            {isSpeaking && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                <Volume2 className="w-4 h-4 animate-pulse" />
                Speaking...
                <Button variant="outline" size="sm" className="ml-2 py-0 px-2" onClick={stop}>Stop</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomepageChatbot;
