import React, { useState, useEffect } from "react";
import { Bot, Mic, Send, User, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { Venue } from "@/hooks/useSupabaseVenues";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type Message = {
  id: string;
  sender: "user" | "bot";
  content: string;
  timestamp: Date;
};

// Extended venue type to match Supabase database fields
interface VenueWithDBFields extends Venue {
  id: string;
  name: string;
  description?: string | null;
  gallery_images?: string[] | null;
  address?: string | null;
  city_id?: string | null;
  city_name?: string | null;
  category_id?: string[] | null;
  category_name?: string[] | string | null;
  min_capacity?: number | null;
  max_capacity?: number | null;
  currency?: string | null;
  starting_price?: number | null;
  price_per_person?: number | null;
  amenities?: string[] | null;
  availability?: string[] | null;
  rating?: number | null;
  reviews_count?: number | null;
  featured?: boolean | null;
  popular?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  parking?: boolean | null;
  wifi?: boolean | null;
  accessibility_features?: string[] | null;
  accepted_payment_methods?: string[] | null;
  opening_hours?: Record<string, { open: string; close: string }> | null;
  owner_info?: { 
    name?: string; 
    contact?: string;
    user_id?: string;
    response_time?: string;
  } | null;
  additional_services?: string[] | null;
  rules_and_regulations?: Array<{
    title: string;
    description: string;
    category?: string;
  }> | null;
  type?: string | null;
  zipcode?: string | null;
  image_url?: string | null;
  status?: string | null;
}

const CHAT_STORAGE_KEY = "homeVenueAssistantChat";
const MAX_MSGS = 40;

const HomePageVenueChatbot: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  // extract id from `/venue/:id`
  const id = params.id || (location.pathname.startsWith("/venue/") && location.pathname.split("/")[2]);
  const [venue, setVenue] = useState<VenueWithDBFields | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatbotState, setChatbotState] = useState<"idle" | "thinking" | "error">("idle");
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [lastBotShouldSpeak, setLastBotShouldSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { toast } = useToast();

  // Speech synth/rec
  const { speak, stop, isSupported: speechSynthesisSupported } = useSpeechSynthesis();
  const {
    startListening,
    stopListening,
    isSupported: speechRecognitionSupported
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setInputMessage(transcript);
      setIsListening(false);
      if (transcript) handleSendMessage(transcript, { viaMic: true });
    },
    onEnd: () => setIsListening(false),
    onError: (err) => {
      setIsListening(false);
      setIsVoiceAvailable(false);
      toast({
        title: "Speech Recognition Error",
        description: "Speech recognition not supported or not permitted."
      });
    }
  });

  // Retrieve venue if pathname matches venue route
  useEffect(() => {
    let ignore = false;
    const fetchVenue = async () => {
      if (!id) {
        setVenue(null);
        return;
      }
      setVenueLoading(true);
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!ignore) {
        if (data) {
          setVenue(data as VenueWithDBFields);
        } else {
          setVenue(null);
        }
        setVenueLoading(false);
      }
    };
    if (id) fetchVenue();
    else setVenue(null);
    return () => { ignore = true; };
  }, [id, location.pathname]);

  // Initial msg
  useEffect(() => {
    let greeting = "Welcome! I'm your assistant. How can I help you with your event plans today?";
    if (venue && venue.name) {
      greeting = `Hi! I'm your assistant for ${venue.name}. Ask me anything about this venue!`;
    }
    setMessages([
      {
        id: "init",
        sender: "bot",
        content: greeting,
        timestamp: new Date()
      }
    ]);
  }, [venue?.id]);

  // ===== MSG SEND LOGIC ====
  const generateId = () => Math.random().toString(36).substring(2, 10);

  // Comprehensive entity-matching QA on venue object
  const getVenueAnswer = (query: string): string => {
    if (!venue) return "Sorry, I couldn't find venue information for this page.";

    const v = venue;
    query = query.toLowerCase();
    
    // Simple greeting - just respond with a friendly greeting
    if (/^(hi|hello|hey|مرحبا|اهلا|السلام عليكم)$/i.test(query.trim())) {
      const isArabic = /[\u0600-\u06FF]/.test(query);
      if (isArabic) {
        return `مرحباً! كيف يمكنني مساعدتك بخصوص ${v.name}؟`;
      } else {
        return `Hello! How can I help you with information about ${v.name}?`;
      }
    }
    
    // Complete details
    if (/more details|tell me more|explain|elaborate|details|all info|full details|everything|more information|كل التفاصيل|شرح|تفاصيل/i.test(query)) {
      let response = `${v.name} is a venue `;
      
      if (v.city_name) {
        response += `located in ${v.city_name}. `;
      }
      
      if (v.description) {
        response += `\n\nDescription: ${v.description} `;
      }
      
      if (v.min_capacity || v.max_capacity) {
        response += `\n\nCapacity: Accommodates from ${v.min_capacity || '?'} to ${v.max_capacity || '?'} guests. `;
      }
      
      if (v.starting_price) {
        const currency = v.currency || 'SAR';
        response += `\n\nPricing: Starting at ${v.starting_price} ${currency}`;
        if (v.price_per_person) {
          response += `, with a per-person rate of ${v.price_per_person} ${currency}`;
        }
        response += `. `;
      }
      
      if (v.address) {
        response += `\n\nAddress: ${v.address}, ${v.city_name || ''}. `;
      }
      
      if (v.category_name && Array.isArray(v.category_name)) {
        response += `\n\nCategories: ${v.category_name.join(', ')}. `;
      } else if (v.category_name) {
        response += `\n\nCategories: ${v.category_name}. `;
      }
      
      if (v.amenities && v.amenities.length > 0) {
        response += `\n\nAmenities: ${v.amenities.join(', ')}. `;
      }
      
      if (v.wifi !== undefined) {
        response += `\n\nWiFi: ${v.wifi ? 'Available' : 'Not available'}. `;
      }
      
      if (v.parking !== undefined) {
        response += `\n\nParking: ${v.parking ? 'Available' : 'Not available'}. `;
      }
      
      if (v.accessibility_features && v.accessibility_features.length > 0) {
        response += `\n\nAccessibility features: ${v.accessibility_features.join(', ')}. `;
      }
      
      if (v.rating) {
        response += `\n\nRating: ${v.rating}/5 (${v.reviews_count || 0} reviews). `;
      }
      
      if (v.accepted_payment_methods && v.accepted_payment_methods.length > 0) {
        response += `\n\nAccepted payment methods: ${v.accepted_payment_methods.join(', ')}. `;
      }
      
      if (v.opening_hours && Object.keys(v.opening_hours).length > 0) {
        response += `\n\nOpening Hours: `;
        Object.entries(v.opening_hours).forEach(([day, hours]) => {
          if (hours && hours.open && hours.close) {
            response += `\n${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.open} - ${hours.close}`;
          }
        });
      }
      
      if (v.additional_services && v.additional_services.length > 0) {
        response += `\n\nAdditional Services: ${v.additional_services.join(', ')}. `;
      }
      
      if (v.rules_and_regulations && Array.isArray(v.rules_and_regulations) && v.rules_and_regulations.length > 0) {
        response += `\n\nRules and Regulations: `;
        v.rules_and_regulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            response += `\n${index + 1}. ${rule.title}: ${rule.description}`;
          }
        });
      }
      
      return response;
    }
    
    // Capacity queries
    if (/max(imum)? capacity|max guests|most people|how many people|max attendees/i.test(query)) {
      return `${v.name} can accommodate up to ${v.max_capacity || '?'} guests.`;
    }
    if (/min(imum)? capacity|min guests|fewest people|least people|min attendees/i.test(query)) {
      return `${v.name} requires a minimum of ${v.min_capacity || '?'} guests.`;
    }

    // Price related queries
    if (/price|cost|fee|how much|rate|pricing/i.test(query)) {
      const currency = v.currency || "SAR";
      let start = v.starting_price || 0;
      let text = `The starting price for ${v.name} is ${start.toLocaleString()} ${currency}.`;
      if (v.price_per_person)
        text += ` There is also a per-person rate of ${v.price_per_person.toLocaleString()} ${currency}.`;
      return text;
    }
    
    // Location queries
    if (/location|address|where|place|situated|city|area/i.test(query)) {
      return `${v.name} is located at ${v.address || '(address not specified)'}, ${v.city_name || ''}.`;
    }
    
    // Amenities queries
    if (/amenities|facilities|features|offer|provide|service/i.test(query)) {
      if (!v.amenities || v.amenities.length === 0)
        return `${v.name} does not have any listed amenities.`;
      return `${v.name} offers the following amenities: ${v.amenities.join(", ")}.`;
    }
    
    // Wi-Fi queries
    if (/wifi|internet|connection/i.test(query)) {
      return v.wifi 
        ? `Yes, ${v.name} provides WiFi connectivity.` 
        : `No, ${v.name} does not offer WiFi.`;
    }
    
    // Parking queries
    if (/parking|car|vehicle|lot|garage/i.test(query)) {
      return v.parking 
        ? `Yes, ${v.name} has parking facilities available.` 
        : `No, ${v.name} does not have dedicated parking.`;
    }
    
    // Accessibility queries
    if (/accessibility|accessible|wheelchair|disabled|handicap/i.test(query)) {
      if (!v.accessibility_features || v.accessibility_features.length === 0)
        return `I don't have specific information about accessibility features for ${v.name}.`;
      return `${v.name} offers these accessibility features: ${v.accessibility_features.join(", ")}.`;
    }
    
    // Category/Type queries
    if (/category|type|kind|event type/i.test(query)) {
      if (v.category_name && Array.isArray(v.category_name)) {
        return `${v.name} is categorized as: ${v.category_name.join(', ')}.`;
      } else if (v.category_name) {
        return `${v.name} is categorized as: ${v.category_name}.`;
      } else if (v.type) {
        return `${v.name} is categorized as: ${v.type}.`;
      } else {
        return `I don't have specific category information for ${v.name}.`;
      }
    }
    
    // Payment methods queries
    if (/payment|pay|credit card|cash/i.test(query)) {
      if (!v.accepted_payment_methods || v.accepted_payment_methods.length === 0)
        return `I don't have specific information about accepted payment methods for ${v.name}.`;
      return `${v.name} accepts the following payment methods: ${v.accepted_payment_methods.join(", ")}.`;
    }
    
    // Rating queries
    if (/rating|review|score|stars/i.test(query)) {
      return v.rating 
        ? `${v.name} has a rating of ${v.rating}/5 based on ${v.reviews_count || 0} reviews.`
        : `${v.name} does not have any ratings yet.`;
    }
    
    // Hours queries
    if (/hours|open|close|opening|closing|time/i.test(query)) {
      if (!v.opening_hours || Object.keys(v.opening_hours).length === 0)
        return `I don't have specific information about operating hours for ${v.name}.`;
      
      const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      let hoursText = `${v.name} operating hours:\n`;
      days.forEach(day => {
        const hours = v.opening_hours?.[day];
        if (hours && hours.open && hours.close) {
          hoursText += `${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.open} - ${hours.close}\n`;
        } else {
          hoursText += `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
        }
      });
      return hoursText;
    }
    
    // Additional services queries
    if (/additional services|extra services|other services/i.test(query)) {
      if (!v.additional_services || v.additional_services.length === 0) {
        return `${v.name} does not list any additional services.`;
      }
      return `${v.name} offers these additional services: ${v.additional_services.join(", ")}.`;
    }
    
    // Rules and regulations queries
    if (/rules|regulations|policies|guidelines|restrictions/i.test(query)) {
      if (!v.rules_and_regulations || !Array.isArray(v.rules_and_regulations) || v.rules_and_regulations.length === 0)
        return `I don't have specific information about rules and regulations for ${v.name}.`;
      
      let rulesText = `Rules and regulations for ${v.name}:\n\n`;
      v.rules_and_regulations.forEach((rule, index) => {
        if (typeof rule === 'object' && rule.title && rule.description) {
          rulesText += `${index + 1}. ${rule.title}: ${rule.description}\n`;
        }
      });
      return rulesText;
    }
    
    // Owner info queries
    if (/owner|contact person|manager|host/i.test(query)) {
      if (!v.owner_info) return `No owner information is available for ${v.name}.`;
      const owner = v.owner_info;
      let ownerText = `Contact information for ${v.name}:\n`;
      if (owner.name) ownerText += `Name: ${owner.name}\n`;
      if (owner.contact) ownerText += `Contact: ${owner.contact}\n`;
      if (owner.response_time) ownerText += `Typical response time: ${owner.response_time}\n`;
      return ownerText;
    }
    
    // Gallery/Images queries
    if (/images|photos|gallery|pictures/i.test(query)) {
      const count = v.gallery_images?.length || 0;
      return count > 0 
        ? `${v.name} has ${count} photos in the gallery. You can view them on this page.` 
        : "There are no images available for this venue.";
    }
    
    // Availability queries
    if (/availability|available|dates|calendar/i.test(query)) {
      if (!v.availability || v.availability.length === 0) {
        return "No specific availability information is provided for this venue. Please use the booking form to check available dates.";
      }
      return `Available dates: ${v.availability.join(", ")}`;
    }
    
    // Description or unknown query
    if (/describe|about|what is|overview|details/.test(query)) {
      return v.description || `This is ${v.name} in ${v.city_name || ''}.`;
    }

    // Fallback for general queries
    return `${v.name} is a venue in ${v.city_name || ''}. It can accommodate ${v.min_capacity || 0}-${v.max_capacity || 0} guests with prices starting at ${v.starting_price || 0} ${v.currency || "SAR"}. You can ask me about specific details like amenities, location, hours, etc.`;
  };

  // Generic home page assistant
  const getDefaultAnswer = (query: string): string => {
    query = query.toLowerCase();
    
    // Simple greeting - just respond with a friendly greeting
    if (/^(hi|hello|hey|مرحبا|اهلا|السلام عليكم)$/i.test(query.trim())) {
      const isArabic = /[\u0600-\u06FF]/.test(query);
      if (isArabic) {
        return `مرحباً! كيف يمكنني مساعدتك اليوم؟`;
      } else {
        return `Hello! How can I help you today?`;
      }
    }
    
    if (/venue|find|location|place|hall|space|where|help me find/i.test(query)) {
      return "You can search for venues using the search bar or browse our featured venues below. What type of event are you planning?";
    }
    
    if (/wedding|marriage|bride|groom/i.test(query)) {
      return "We have beautiful wedding venues available! You can filter for wedding halls using the search function or browse our wedding category.";
    }
    
    if (/conference|meeting|business|corporate|workshop/i.test(query)) {
      return "For business events, we offer professional conference venues with all the amenities you need. Try searching for 'conference rooms' or 'meeting spaces'.";
    }
    
    if (/party|celebration|birthday|anniversary/i.test(query)) {
      return "Looking for a celebration venue? We have many options for parties and special occasions. Filter by 'party venue' or browse our listings.";
    }
    
    if (/price|cost|fee|expensive|cheap|budget|affordable/i.test(query)) {
      return "Our venues range from budget-friendly to luxury options. You can filter venues by price range in our search to find one that matches your budget.";
    }
    
    if (/capacity|people|guests|group size|attendees/i.test(query)) {
      return "You can filter venues by capacity to ensure they can accommodate your group size. Just use the capacity filter in our search functionality.";
    }
    
    if (/location|city|area|region|neighborhood/i.test(query)) {
      return "We have venues across multiple cities and neighborhoods. Use our location filter to find venues in your preferred area.";
    }
    
    if (/reservation|booking|reserve|book|schedule/i.test(query)) {
      return "To book a venue, select a venue you like, check its availability for your event date, and follow the booking process. You can contact venue owners directly through our platform.";
    }
    
    if (/payment|pay|deposit|refund|cancel/i.test(query)) {
      return "Payment methods vary by venue. Most venues require a deposit to secure your booking. Cancellation policies are listed on each venue's page.";
    }
    
    if (/help|support|contact|assistance/i.test(query)) {
      return "Need help? You can contact our support team through the 'Contact Us' link in the footer, or email support@findvenue.com.";
    }
    
    return "I'm your assistant for FindVenue! Ask me about finding venues, booking processes, or any features of our platform. How can I help you today?";
  };

  const handleSendMessage = async (
    customMessage?: string,
    options?: { viaMic?: boolean }
  ) => {
    const messageText = customMessage || inputMessage;
    if (messageText.trim() === "" || chatbotState === "thinking") return;
    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        sender: "user",
        content: messageText,
        timestamp: new Date()
      }
    ]);
    setInputMessage("");
    setChatbotState("thinking");
    // voice logic:
    if (options?.viaMic) setAudioEnabled(true);

    try {
      let resp = venue ? getVenueAnswer(messageText) : getDefaultAnswer(messageText);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            sender: "bot",
            content: resp,
            timestamp: new Date()
          }
        ]);
        setLastBotShouldSpeak(options?.viaMic || isSpeakerOn);
        setChatbotState("idle");
      }, 500);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          sender: "bot",
          content: "Sorry, something went wrong.",
          timestamp: new Date()
        }
      ]);
      setChatbotState("error");
      setTimeout(() => setChatbotState("idle"), 1500);
    }
  };

  // Voice/speaker logic: only speak if via mic or speaker enabled
  useEffect(() => {
    if (lastBotShouldSpeak && speechSynthesisSupported && messages.length && messages[messages.length - 1].sender === "bot") {
      speak(messages[messages.length - 1].content, () => setIsSpeaking(true), () => setIsSpeaking(false));
      setLastBotShouldSpeak(false);
    }
    // eslint-disable-next-line
  }, [messages, lastBotShouldSpeak, speechSynthesisSupported]);

  // Chat widget UI
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed bottom-4 right-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="Home Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
            <p>
              {venue?.name
                ? `Chat with ${venue.name} Assistant`
                : "FindVenue Home Assistant"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[540px] h-[620px] p-0 overflow-hidden right-[5%] bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col rounded-xl border border-white/10">
          <DialogTitle className="sr-only">
            {venue?.name ? venue.name + " Assistant" : "FindVenue Home Assistant"}
          </DialogTitle>
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="rounded-full h-8 w-8 hover:bg-white/10"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {venueLoading ? (
              <div className="flex justify-center items-center h-full w-full">
                <Skeleton className="w-36 h-10" />
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      message.sender === "user"
                        ? "bg-blue-600"
                        : "bg-findvenue-card-bg border border-findvenue-border"
                    }`}>
                      {message.sender === "user"
                        ? <User className="h-4 w-4" />
                        : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.sender === "user"
                          ? "bg-findvenue text-white"
                          : "bg-findvenue-card-bg border border-findvenue-border flex items-center gap-2"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.sender === "bot" && speechSynthesisSupported && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => speak(message.content)}
                          className="ml-1 h-7 w-7 flex-shrink-0"
                        >
                          <Volume2 className="h-4 w-4 text-findvenue cursor-pointer" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {chatbotState === "thinking" && (
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
          </div>
          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 items-center">
              <Input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder={
                  venue?.name
                    ? `Ask about ${venue.name}...`
                    : "Ask me anything!"
                }
                className="bg-findvenue-surface/50 border-white/10"
                disabled={chatbotState === "thinking" || isListening}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSendMessage();
                }}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={inputMessage.trim() === "" || chatbotState === "thinking"}
                className="bg-findvenue hover:bg-findvenue-dark"
                aria-label="Send"
              >
                {chatbotState === "thinking" ? (
                  <div className="h-4 w-4 border-2 border-r-transparent border-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              {/* Voice input */}
              {speechRecognitionSupported !== false && (
                <Button
                  onClick={isListening ? stopListening : () => { setIsListening(true); startListening(); }}
                  className={`ml-1 ${isListening ? "bg-findvenue" : "bg-findvenue-surface/80"} border border-findvenue/30 hover:bg-findvenue/20 transition duration-150 ${isListening ? "animate-pulse" : ""}`}
                  disabled={chatbotState === "thinking"}
                  size="icon"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
              {/* Speaker toggle */}
              <Button
                size="icon"
                variant={isSpeakerOn ? "default" : "outline"}
                className={isSpeakerOn ? "bg-blue-700" : ""}
                title={isSpeakerOn ? "Speaker on" : "Speaker off"}
                aria-pressed={isSpeakerOn}
                onClick={() => setIsSpeakerOn(on => !on)}
                tabIndex={0}
              >
                <Volume2 className={`h-4 w-4 ${isSpeakerOn ? "text-findvenue" : "text-gray-400"}`} />
              </Button>
            </div>
            <p className="text-xs text-findvenue-text-muted mt-2">
              {venue?.name
                ? `Ask about capacity, pricing, amenities, or any details of ${venue.name}!`
                : "Ask about the platform, search for venues, or anything else you need!"}
              {speechRecognitionSupported === false &&
                <span className="text-yellow-500 ml-2">Voice features not supported in your browser.</span>}
            </p>
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                <Mic className="w-4 h-4 animate-pulse" />
                Listening... Speak now!
                <Button variant="outline" size="sm" className="ml-2 py-0 px-2" onClick={stopListening}>Stop</Button>
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

export default HomePageVenueChatbot;
