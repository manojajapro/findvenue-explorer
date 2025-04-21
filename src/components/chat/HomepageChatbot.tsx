import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

interface ExtendedVenue extends Venue {
  price_per_person?: number;
}

const HomepageChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      sender: 'bot',
      content: "Hello! I'm your venue assistant. I can help you find the perfect venue. What type of venue are you looking for?",
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

  const getVenueSearchCriteria = (query: string) => {
    const keywords = [
      'venue', 'venues', 'wedding', 'conference', 'exhibition',
      'party', 'corporate', 'hall', 'room', 'ballroom', 'beach',
      'hotel', 'private', 'dining', 'training', 'graduation', 'meeting'
    ];
    const cityKeywords = [
      "riyadh", "jeddah", "khobar", "dammam", "mecca", "medina", "abha", "taif", "khamis", "khamis mushait"
    ];
    const q = query.toLowerCase();
    let type = '';
    let city = '';

    keywords.forEach(k => { if (q.includes(k)) type = k; });
    cityKeywords.forEach(c => { if (q.includes(c)) city = c; });

    if (type || city) {
      return { type, city };
    }
    return null;
  };

  const getMatchingVenues = (venues: Venue[], query: string) => {
    const search = getVenueSearchCriteria(query);

    if (search?.city || search?.type) {
      return venues.filter(v =>
        (search.city && v.city && v.city.toLowerCase().includes(search.city)) ||
        (search.type && (
          (typeof v.type === 'string' && v.type.toLowerCase().includes(search.type)) ||
          (typeof v.category === 'string' && v.category.toLowerCase().includes(search.type))
        ))
      );
    }

    return venues.filter(v =>
      v.name?.toLowerCase().includes(query.toLowerCase()) ||
      v.city?.toLowerCase().includes(query.toLowerCase()) ||
      v.category?.toString().toLowerCase().includes(query.toLowerCase()) ||
      v.type?.toString().toLowerCase().includes(query.toLowerCase())
    );
  };

  const isVenueListQuery = (query: string) => {
    const venueListRegex = /(list|show|top|suggest|recommend|venues?|halls?)/i;
    return venueListRegex.test(query);
  };

  const isVenueQuery = (query: string) => {
    const keywords = [
      "show", "list", "find", "venues", "venue", "top", "best", "suggest", "recommend", "available", "search", "option", "hall", "ballroom", "space",
      "location", "places"
    ];
    const cityKeywords = [
      "riyadh", "jeddah", "khobar", "dammam", "mecca", "medina", "abha", "taif", "khamis", "khamis mushait"
    ];
    const q = query.toLowerCase();
    if (keywords.some(k => q.includes(k))) return true;
    if (cityKeywords.some(c => q.includes(c))) return true;
    if (/top ?\d+ venues?/.test(q)) return true;
    if (/venues? in/.test(q)) return true;
    return false;
  };

  const isGreeting = (query: string): boolean => {
    const greetings = [
      'hi', 'hello', 'hey', 'how are you', 'how r u', 'what\'s up', 'whats up',
      'good morning', 'good afternoon', 'good evening', 'السلام عليكم', 'مرحبا'
    ];
    
    const normalizedQuery = query.trim().toLowerCase();
    return greetings.some(greet => 
      normalizedQuery === greet || 
      normalizedQuery.startsWith(greet + " ") || 
      normalizedQuery.endsWith(" " + greet)
    );
  }

  const isDirectAttributeQuestion = (query: string): boolean => {
    const attributeKeywords = [
      'city', 'cities', 'location', 'list', 'price', 'capacity', 
      'amenities', 'type', 'types', 'category', 'categories', 
      'name', 'description', 'address', 'rating', 'venue', 'venues'
    ];
    
    const normalizedQuery = query.toLowerCase();
    
    return attributeKeywords.some(keyword => normalizedQuery.includes(keyword)) &&
           (normalizedQuery.includes('what') || 
            normalizedQuery.includes('which') || 
            normalizedQuery.includes('how') || 
            normalizedQuery.includes('list') || 
            normalizedQuery.includes('tell me') ||
            normalizedQuery.includes('show me'));
  }

  const getDirectAttributeAnswer = (query: string): string | null => {
    const normalizedQuery = query.toLowerCase();
    
    if (normalizedQuery.includes('city') || normalizedQuery.includes('cities') || normalizedQuery.includes('locations')) {
      return "The cities with available venues include: Riyadh, Jeddah, Khobar, Dammam, Mecca, Medina, Abha, Taif, and Khamis Mushait.";
    }
    
    if ((normalizedQuery.includes('type') || normalizedQuery.includes('types')) && 
        (normalizedQuery.includes('list') || normalizedQuery.includes('what') || normalizedQuery.includes('show'))) {
      return "Available venue types include: Wedding Halls, Hotel, Hotel Suites, Conference Spaces, Exhibition Halls, Party Venues, and Corporate Events Venues.";
    }
    
    if (normalizedQuery.includes('category') || normalizedQuery.includes('categories')) {
      return "Venue categories include: Wedding Venues, Conference Spaces, Exhibition Halls, Party Venues, Corporate Events, Graduation Parties, Training Courses, Birthday Celebrations, and Business Meetings.";
    }
    
    if (normalizedQuery.includes('price') || normalizedQuery.includes('cost') || normalizedQuery.includes('pricing')) {
      return "Venues are priced based on size, location, and amenities. Prices typically range from 12,000 SAR for small gatherings up to 40,000 SAR for luxury venues. Many venues offer per-person pricing options starting from 150 SAR per guest.";
    }
    
    if (normalizedQuery.includes('capacity') || normalizedQuery.includes('how many') || normalizedQuery.includes('people')) {
      return "Our venues can accommodate various group sizes. Small venues host 20-50 guests, medium venues 50-200 guests, and large venues can accommodate up to 800 guests. You can filter venues by your expected guest count.";
    }
    
    if (normalizedQuery.includes('amenities') || normalizedQuery.includes('facilities') || normalizedQuery.includes('features')) {
      return "Common venue amenities include WiFi, Parking, Catering, Sound Systems, Lighting, Bridal Suites, AV Equipment, Stage Setups, and Outdoor Spaces. Premium venues may offer Valet Parking, Fine Dining, and Decorative Services.";
    }
    
    if ((normalizedQuery.includes('venue') || normalizedQuery.includes('venues')) && 
        !normalizedQuery.includes('specific') && 
        !normalizedQuery.includes('show') &&
        !normalizedQuery.includes('list')) {
      return "Our platform offers a variety of venues for all occasions including weddings, conferences, exhibitions, parties, and corporate events. You can search by location, capacity, price range, or amenities to find the perfect venue.";
    }
    
    return null;
  }

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
      if (isGreeting(messageText)) {
        const greetingResponses = [
          "Hello! How can I help you find a venue today?",
          "Hi there! I'm here to assist with your venue search. What type of event are you planning?",
          "Hey! Looking for a venue? I can help you find the perfect one for your needs.",
          "Hello! I'm your venue assistant. How can I help you today?",
          "Greetings! I'm here to help you find the ideal venue. What are you looking for?"
        ];
        
        const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
        
        const botMessage = {
          id: generateId(),
          sender: 'bot' as const,
          content: randomGreeting,
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, botMessage]);
        setChatbotState('idle');
        setSuggestedVenues([]);
        return;
      }
      
      if (isDirectAttributeQuestion(messageText)) {
        const directAnswer = getDirectAttributeAnswer(messageText);
        if (directAnswer) {
          const botMessage = {
            id: generateId(),
            sender: 'bot' as const,
            content: directAnswer,
            timestamp: new Date()
          };
          
          setMessages(prevMessages => [...prevMessages, botMessage]);
          setChatbotState('idle');
          setSuggestedVenues([]);
          return;
        }
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out")), 30000)
      );
      
      let response;
      try {
        const responsePromise = supabase.functions.invoke('venue-chatbot', {
          body: { query: messageText, ...(options?.viaMic ? { viaMic: true } : {}) }
        });
        response = await Promise.race([responsePromise, timeoutPromise]);
      } catch (error) {
        console.error('Error calling venue-chatbot function:', error);
        throw new Error('Failed to connect to the chatbot service');
      }
      
      if (response.error) {
        console.error('Error from chatbot API:', response.error);
        throw new Error(response.error.message || 'Error from chatbot service');
      }
      
      if (!response.data) {
        console.error('Invalid response format from chatbot service');
        throw new Error('Invalid response format from chatbot service');
      }
      
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

      if (venues && Array.isArray(venues) && venues.length > 0 && (isVenueListQuery(messageText) || messageText.toLowerCase().includes('marriage') || messageText.toLowerCase().includes('wedding'))) {
        const filteredVenues = getMatchingVenues(venues, messageText);
        setSuggestedVenues(filteredVenues.slice(0, 10));
      } else {
        setSuggestedVenues([]);
      }
      setChatbotState('idle');
    } catch (error: any) {
      console.error('Error calling chatbot:', error);
      
      const errorMessage = {
        id: generateId(),
        sender: 'bot' as const,
        content: "I'm sorry, I encountered an error while processing your request. The OpenAI API key might be invalid or there was a connection issue. Please try again later.",
        timestamp: new Date()
      };

      setMessages(prevMessages => [...prevMessages, errorMessage]);
      setChatbotState('error');
      
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: error.message || "Could not connect to the chatbot service. Please try again later."
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
    if (venue.galleryImages && Array.isArray(venue.galleryImages) && venue.galleryImages.length > 0) {
      return venue.galleryImages[0];
    }
    if (venue.gallery_images && Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) {
      return venue.gallery_images[0];
    }
    return '/placeholder.svg';
  };

  const renderVenueCard = (venue: Venue) => {
    const imageUrl = Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0
      ? venue.gallery_images[0]
      : (Array.isArray(venue.galleryImages) && venue.galleryImages.length > 0
        ? venue.galleryImages[0]
        : (venue.imageUrl || venue.image_url || '/placeholder.svg'));

    const venueName = venue.name || "-";

    let price: string = "-";
    if (typeof (venue as any).starting_price === 'number') {
      price = (venue as any).starting_price?.toLocaleString?.() || String((venue as any).starting_price);
    } else if (venue.pricing && typeof venue.pricing.startingPrice === 'number') {
      price = venue.pricing.startingPrice?.toLocaleString?.() || String(venue.pricing.startingPrice);
    } else if (typeof (venue as any).price_per_person === 'number') {
      price = (venue as any).price_per_person?.toLocaleString?.() || String((venue as any).price_per_person);
    }
    
    const currency = (venue as any).currency || (venue.pricing && venue.pricing.currency) || "SAR";

    let guests = "-";
    if (typeof (venue as any).min_capacity === 'number' && typeof (venue as any).max_capacity === 'number') {
      guests = `${(venue as any).min_capacity} - ${(venue as any).max_capacity}`;
    } else if (venue.capacity && typeof venue.capacity.min === 'number' && typeof venue.capacity.max === 'number') {
      guests = `${venue.capacity.min} - ${venue.capacity.max}`;
    }

    return (
      <Card key={venue.id} className="bg-white/90 border p-3 flex gap-3 items-center hover:bg-blue-50 transition cursor-pointer"
        onClick={() => viewVenueDetails(venue.id)}
      >
        <img src={imageUrl} alt={venueName} className="rounded object-cover w-14 h-14 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{venueName}</div>
          <div className="text-xs text-gray-800">
            <b className="mr-1">Price:</b>
            {price} {currency}
          </div>
          <div className="text-xs text-gray-800">
            <b className="mr-1">Guests:</b>
            {guests}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={(e) => { 
              e.stopPropagation(); 
              viewVenueDetails(venue.id);
            }}
          >
            View Details
          </Button>
        </div>
      </Card>
    );
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
          aria-describedby="chatbot-description"
        >
          <DialogTitle className="sr-only">Venue Assistant</DialogTitle>
          <DialogDescription id="chatbot-description" className="sr-only">
            Chat with our venue assistant to find the perfect venue for your event
          </DialogDescription>
          
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
                  {suggestedVenues.length} Matching Venues
                </Badge>
                <div className="space-y-2">
                  {suggestedVenues.map(venue => renderVenueCard(venue))}
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
