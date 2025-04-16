
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Send, X, MessageSquare, Volume2, VolumeX, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  venues?: VenueResult[];
};

type VenueResult = {
  id: string;
  name: string;
  city_name: string;
  image_url?: string;
  gallery_images?: string[];
  description?: string;
  starting_price?: number;
  currency?: string;
  category_name?: string[];
};

// Suggested queries to help users get started
const suggestedQueries = [
  "Find venues in Riyadh for a wedding",
  "Show me conference halls that can host 50+ people",
  "I'm looking for affordable venues under 100 SAR",
  "Which venues have parking available?",
  "Show venues with WiFi and catering",
  "What venues are available this weekend?",
  "Find venues suitable for birthday parties",
  "I need a venue with good accessibility features",
  "Show popular venues with high ratings",
  "Which venues accept online payment?"
];

const SmartVenueAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<SpeechRecognition | null>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem('venueAssistantMessages');
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages);
      } catch (err) {
        console.error('Error parsing stored messages:', err);
      }
    } else {
      // Add welcome message if no stored messages
      const welcomeMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: "Welcome! I'm your venue assistant. I can help you find the perfect venue for your event. You can ask me about venues by location, capacity, amenities, or price range.",
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('venueAssistantMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';
      
      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        
        // Auto submit after voice input
        handleSendMessage(transcript);
      };
      
      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Error recognizing speech. Please try again.');
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognition.current) {
        recognition.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognition.current) return;
    
    try {
      recognition.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };
  
  const stopListening = () => {
    if (recognition.current) {
      recognition.current.abort();
      setIsListening(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const playTextToSpeech = async (text: string) => {
    if (!audioEnabled) return;
    
    setIsSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });
      
      if (error) throw new Error(error.message);
      
      if (data?.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          console.error('Audio playback failed');
          setIsSpeaking(false);
        };
        await audio.play();
      } else {
        throw new Error('No audio data received');
      }
    } catch (err) {
      console.error('Text-to-speech error:', err);
      setIsSpeaking(false);
      toast.error('Failed to play audio response');
    }
  };

  const stopSpeaking = () => {
    // Stop all audio playback
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  const processChatResponse = async (userMessage: string) => {
    setIsLoading(true);
    
    // Add user message to chat
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setShowSuggestions(false);
    
    try {
      // Call the venue-assistant Edge Function
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: { query: userMessage, type: 'chat' }
      });
      
      if (error) throw new Error(error.message);
      
      let venues: VenueResult[] = [];
      
      // Get venue recommendations based on the query
      if (userMessage.toLowerCase().includes('venue') || 
          userMessage.toLowerCase().includes('place') || 
          userMessage.toLowerCase().includes('hall') ||
          userMessage.toLowerCase().includes('find') ||
          userMessage.toLowerCase().includes('looking for') ||
          userMessage.toLowerCase().includes('show me')) {
        
        // Basic search criteria extraction
        let searchQuery = userMessage.toLowerCase();
        let cityFilter = '';
        let categoryFilter = '';
        let maxPriceFilter = 10000; // Default high price
        
        // Extract city
        ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'].forEach(city => {
          if (searchQuery.includes(city)) {
            cityFilter = city;
          }
        });
        
        // Extract category
        const commonCategories = ['wedding', 'birthday', 'meeting', 'conference', 'party', 'workshop'];
        commonCategories.forEach(category => {
          if (searchQuery.includes(category)) {
            categoryFilter = category;
          }
        });
        
        // Extract price ranges
        if (searchQuery.includes('cheap') || searchQuery.includes('affordable')) {
          maxPriceFilter = 100;
        } else if (searchQuery.includes('expensive') || searchQuery.includes('luxury')) {
          maxPriceFilter = 1000;
        }
        
        // Query Supabase for venues
        let query = supabase.from('venues').select('id, name, city_name, gallery_images, description, starting_price, currency, category_name')
          .limit(5);
          
        if (cityFilter) {
          query = query.ilike('city_name', `%${cityFilter}%`);
        }
        
        if (categoryFilter) {
          query = query.contains('category_name', [categoryFilter]);
        }
        
        if (maxPriceFilter < 10000) {
          query = query.lte('starting_price', maxPriceFilter);
        }
        
        const { data: venueData } = await query;
        
        if (venueData && venueData.length > 0) {
          venues = venueData;
        }
      }
      
      // Create assistant response
      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: data?.answer || "I'm sorry, I couldn't find an answer to your query.",
        timestamp: Date.now(),
        venues: venues.length > 0 ? venues : undefined
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      // Read response aloud if audio is enabled
      if (audioEnabled && data?.answer) {
        await playTextToSpeech(data.answer);
      }
    } catch (err) {
      console.error('Error processing chat:', err);
      
      // Add error message
      const errorMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue;
    if (!messageText.trim() || isLoading) return;
    
    await processChatResponse(messageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    const welcomeMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: "Welcome! I'm your venue assistant. I can help you find the perfect venue for your event. You can ask me about venues by location, capacity, amenities, or price range.",
      timestamp: Date.now()
    };
    
    setMessages([welcomeMessage]);
    localStorage.setItem('venueAssistantMessages', JSON.stringify([welcomeMessage]));
    setShowSuggestions(true);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getVenueImage = (venue: VenueResult) => {
    if (venue.image_url) return venue.image_url;
    if (venue.gallery_images && venue.gallery_images.length > 0) return venue.gallery_images[0];
    return '/placeholder.svg';
  };

  return (
    <>
      {/* Floating button to open chat */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="fixed bottom-6 right-6 z-50"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <Button
                onClick={() => setIsOpen(true)}
                size="lg"
                className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg flex items-center justify-center"
                aria-label="Open Venue Assistant"
              >
                <MessageSquare className="h-6 w-6 text-white" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 border-blue-800">
            <p className="text-white">Ask about venues</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Chat dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
              className="w-full max-w-lg h-[600px] max-h-[80vh] bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl shadow-2xl overflow-hidden border border-slate-700/50 flex flex-col"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 bg-blue-600">
                    <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="AI" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-white">Venue Assistant</h3>
                    <p className="text-xs text-slate-400">Ask me about venues and events</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8"
                    onClick={toggleAudio}
                    aria-label={audioEnabled ? "Disable voice responses" : "Enable voice responses"}
                  >
                    {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8"
                    onClick={clearChat}
                    aria-label="Clear chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {showSuggestions && (
                  <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-2">Try asking about:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQueries.slice(0, 5).map((query, idx) => (
                        <Badge 
                          key={idx}
                          variant="outline" 
                          className="cursor-pointer bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 transition-colors"
                          onClick={() => handleSendMessage(query)}
                        >
                          {query}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col max-w-[85%]">
                      <div className={`rounded-xl p-3 ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white ml-4' 
                          : 'bg-slate-800/70 border border-slate-700/50 mr-4 text-slate-100'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        
                        {/* Venue recommendations */}
                        {msg.venues && msg.venues.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="font-medium text-sm mb-2">Recommended Venues</p>
                            <div className="space-y-2">
                              {msg.venues.slice(0, 3).map(venue => (
                                <Link 
                                  key={venue.id}
                                  to={`/venue/${venue.id}`}
                                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                                >
                                  <div className="w-10 h-10 rounded overflow-hidden bg-slate-800 shrink-0">
                                    <img 
                                      src={getVenueImage(venue)} 
                                      alt={venue.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm text-white">{venue.name}</h4>
                                    <p className="text-xs text-slate-300">{venue.city_name}</p>
                                  </div>
                                </Link>
                              ))}
                              
                              {msg.venues.length > 3 && (
                                <Link 
                                  to="/venues" 
                                  className="block text-center text-xs text-blue-400 hover:text-blue-300 py-1"
                                >
                                  + {msg.venues.length - 3} more venues
                                </Link>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs text-slate-500 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-slate-300">Thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me about venues..."
                      disabled={isLoading || isListening}
                      className="bg-slate-800/50 border-slate-700 focus-visible:ring-blue-500 text-white placeholder:text-slate-400 pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  
                  {/* Voice input button */}
                  <Button
                    type="button"
                    size="icon"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)}
                    className={`${isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`
                    }
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  
                  {/* Send button */}
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartVenueAssistant;
