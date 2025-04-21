
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

const CHAT_STORAGE_KEY = "homeVenueAssistantChat";
const MAX_MSGS = 40;

const HomePageVenueChatbot: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  // extract id from `/venue/:id`
  const id = params.venueId || (location.pathname.startsWith("/venue/") && location.pathname.split("/")[2]);
  const [venue, setVenue] = useState<Venue | null>(null);
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
          setVenue({
            ...data,
            capacity: {
              min: typeof data.min_capacity === "string" ? parseInt(data.min_capacity) : data.min_capacity || 0,
              max: typeof data.max_capacity === "string" ? parseInt(data.max_capacity) : data.max_capacity || 0
            },
            pricing: {
              currency: data.currency || "SAR",
              startingPrice: data.starting_price || 0,
              pricePerPerson: data.price_per_person,
              hourlyRate: data.hourly_rate || undefined
            },
            amenities: data.amenities || [],
            galleryImages: data.gallery_images || [],
            city: data.city_name || "",
            ownerInfo: data.owner_info,
            accessibilityFeatures: data.accessibility_features,
            acceptedPaymentMethods: data.accepted_payment_methods,
            // ... add any other processing as needed
          } as Venue);
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

  // Very basic entity-matching QA on venue object (copied/refined from previous chatbot)
  const getVenueAnswer = (query: string): string => {
    if (!venue) return "Sorry, I couldn't find venue information for this page.";

    const v = venue;
    query = query.toLowerCase();
    // Max capacity
    if (/max(imum)? capacity|max guests|most people|how many people|max attendees/i.test(query)) {
      return `${v.name} can accommodate up to ${v.capacity?.max ?? 0} guests.`;
    }
    // Min capacity
    if (/min(imum)? capacity|min guests|fewest people|least people|min attendees/i.test(query)) {
      return `${v.name} requires a minimum of ${v.capacity?.min ?? 0} guests.`;
    }
    // Price
    if (/price|cost|fee|how much|rate|pricing/i.test(query)) {
      const currency = v.pricing?.currency || "SAR";
      let start = v.pricing?.startingPrice || 0;
      let text = `The starting price for ${v.name} is ${start.toLocaleString()} ${currency}.`;
      if (v.pricing?.pricePerPerson)
        text += ` There is also a per-person rate of ${v.pricing.pricePerPerson.toLocaleString()} ${currency}.`;
      return text;
    }
    // Address/location
    if (/location|address|where|place|situated|city|area/i.test(query)) {
      return `${v.name} is located at ${v.address}, ${v.city}.`;
    }
    // Amenities
    if (/amenities|facilities|features|offer|provide|service/i.test(query)) {
      if (!v.amenities || v.amenities.length === 0)
        return `${v.name} does not have any listed amenities.`;
      return `${v.name} offers: ${v.amenities.join(", ")}.`;
    }
    if (/wifi|internet/i.test(query)) {
      return v.wifi ? "Yes, WiFi is available." : "No, WiFi is not available.";
    }
    if (/parking|car|vehicle/i.test(query)) {
      return v.parking ? "Yes, parking is available." : "No, parking is not available.";
    }
    if (/accessibility|accessible|wheelchair|disabled/i.test(query)) {
      let features = v.accessibilityFeatures;
      if (!features || !features.length)
        return "No specific accessibility features are listed for this venue.";
      return `${v.name} accessibility features: ${features.join(", ")}.`;
    }
    if (/category|type|kind|event type/i.test(query)) {
      return v.category
        ? `${v.name} is categorized as: ${v.category}.`
        : "I do not have the category for this venue.";
    }
    // Payment methods
    if (/payment|pay|credit card|cash/i.test(query)) {
      return v.acceptedPaymentMethods && v.acceptedPaymentMethods.length
        ? `${v.name} accepts: ${v.acceptedPaymentMethods.join(", ")}.`
        : `No specific payment method info is available.`;
    }
    if (/rating|review|score|stars/i.test(query)) {
      return `${v.name} is rated ${v.rating || 0}/5 from ${v.reviews || 0} reviews.`;
    }
    if (/hours|open|close|opening|closing|time/i.test(query)) {
      if (!v.openingHours) return "No operating hours are listed.";
      const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      let hoursText = `${v.name} operating hours:\n`;
      days.forEach(day => {
        const h = v.openingHours?.[day];
        hoursText += `${day[0].toUpperCase() + day.slice(1)}: ${h ? `${h.open}–${h.close}` : "Closed"}\n`;
      });
      return hoursText;
    }
    // Description or unknown query
    if (/describe|about|what is|overview|details/.test(query)) {
      return v.description || `This is ${v.name} in ${v.city}.`;
    }
    return `${v.name} is a venue in ${v.city}.`;
  };

  // Generic home page assistant
  const getDefaultAnswer = (query: string): string => {
    query = query.toLowerCase();
    if (/venue|find|help/i.test(query)) {
      return "You can search for venues, ask about events, or click on a venue card for more info!";
    }
    return "I'm your assistant for FindVenue! Ask about venue discovery, the booking process, or anything else you need.";
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
