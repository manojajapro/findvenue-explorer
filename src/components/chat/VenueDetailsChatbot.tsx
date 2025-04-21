
import React, { useState, useEffect } from "react";
import { Bot, User, Mic, Send, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

type Venue = {
  id: string;
  name: string;
  description: string | null;
  gallery_images: string[] | null;
  address: string | null;
  city_id: string | null;
  city_name: string | null;
  category_id: string[] | null;
  category_name: string[] | null;
  min_capacity: number | null;
  max_capacity: number | null;
  currency: string | null;
  starting_price: number | null;
  price_per_person: number | null;
  amenities: string[] | null;
  availability: string[] | null;
  rating: number | null;
  reviews_count: number | null;
  featured: boolean | null;
  popular: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  latitude: number | null;
  longitude: number | null;
  parking: boolean | null;
  wifi: boolean | null;
  accessibility_features: string[] | null;
  accepted_payment_methods: string[] | null;
  opening_hours: any;
  owner_info: any;
  additional_services: string[] | null;
  rules_and_regulations: any;
  type: string | null;
  zipcode: string | null;
  image_url: string | null;
  status: string | null;
};

type Message = {
  id: string;
  sender: "user" | "bot";
  content: string;
  timestamp: Date;
};

const VenueDetailsChatbot: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [venueLoading, setVenueLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatbotState, setChatbotState] = useState<"idle" | "thinking" | "error">("idle");
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastBotShouldSpeak, setLastBotShouldSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { speak, stop, isSupported: speechSynthesisSupported } = useSpeechSynthesis();
  const { toast } = useToast();
  const { startListening, stopListening, isSupported: speechRecognitionSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setInputMessage(transcript);
      setIsListening(false);
      if (transcript) handleSendMessage(transcript, { viaMic: true });
    },
    onEnd: () => setIsListening(false),
    onError: () => {
      setIsListening(false);
      toast({
        title: "Speech Recognition Error",
        description: "Speech recognition not supported or not permitted.",
      });
    },
  });

  // Fetch venue by id on load
  useEffect(() => {
    let ignore = false;
    if (!id) return;
    setVenueLoading(true);
    supabase
      .from("venues")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!ignore && data) setVenue(data as Venue);
        setVenueLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let greeting = "Welcome! I'm your assistant. Ask me anything about this venue!";
    if (venue && venue.name) {
      greeting = `Hi! I'm your assistant for ${venue.name}. Ask me anything about this venue!`;
    }
    setMessages([
      {
        id: "init",
        sender: "bot",
        content: greeting,
        timestamp: new Date(),
      },
    ]);
  }, [venue?.id]);
  
  function generateId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function safeList(arr: any[] | null, sep = ", ") {
    if (!arr || arr.length === 0) return "Not available";
    return arr.join(sep);
  }

  // Answer logic using all attributes
  function getVenueAnswer(query: string): string {
    if (!venue) return "Sorry, I couldn't find information for this venue.";
    const v = venue;
    const q = query.toLowerCase();

    // Basic queries
    if (/name/i.test(q)) return `The venue's name is ${v.name}.`; 
    if (/(address|where|location)/i.test(q)) return v.address ? `Address: ${v.address}` : "No address is listed.";
    if (/(city|city name|which city|located in)/i.test(q)) return v.city_name ? `City: ${v.city_name}` : "No city listed.";
    if (/(category|categories|category name)/i.test(q)) return v.category_name?.length ? `Categories: ${safeList(v.category_name)}` : "No category information.";
    if (/min(imum)? capacity|min guests|min people/.test(q)) return v.min_capacity ? `Minimum capacity: ${v.min_capacity} guests.` : "No minimum capacity listed.";
    if (/max(imum)? capacity|max guests|max people/.test(q)) return v.max_capacity ? `Maximum capacity: ${v.max_capacity} guests.` : "No maximum capacity listed.";
    if (/(price|cost|fee|starting price|how much)/i.test(q)) {
      let msg = v.starting_price ? `Starting price: ${v.starting_price} ${v.currency || ""}.` : "No price info.";
      if (v.price_per_person) msg += ` Per person: ${v.price_per_person} ${v.currency || ""}.`;
      return msg;
    }
    if (/amenities|features|facilit(y|ies)/i.test(q)) return v.amenities?.length ? `Amenities: ${safeList(v.amenities)}` : "No amenities listed.";
    if (/availability|available|dates|calendar/i.test(q)) return v.availability?.length ? `Available dates: ${safeList(v.availability)}` : "No availability info.";
    if (/rating|review|score|stars/i.test(q)) return v.rating ? `${v.name} has a rating of ${v.rating}/5 from ${v.reviews_count || 0} reviews.` : "No rating information.";
    if (/(feature|popular)/i.test(q)) {
      let msg = [];
      if (v.featured) msg.push("This venue is featured.");
      if (v.popular) msg.push("This venue is popular.");
      return msg.length ? msg.join(" ") : "It's not marked as featured or popular.";
    }
    if (/created|added|listed|when/.test(q)) return v.created_at ? `Created at: ${v.created_at}` : "No creation date.";
    if (/updated|last update/.test(q)) return v.updated_at ? `Updated at: ${v.updated_at}` : "No update date.";
    if (/lat(it(u)?de)?/.test(q)) return v.latitude ? `Latitude: ${v.latitude}` : "No latitude info.";
    if (/long(it(u)?de)?/.test(q)) return v.longitude ? `Longitude: ${v.longitude}` : "No longitude info.";
    if (/(parking)/i.test(q)) return v.parking ? "Parking is available." : "No parking.";
    if (/(wifi|internet)/i.test(q)) return v.wifi ? "WiFi is available." : "No WiFi.";
    if (/access(ibility|ible|wheelchair|disabled|handicap)/i.test(q)) return v.accessibility_features?.length ? `Accessibility: ${safeList(v.accessibility_features)}` : "No accessibility features listed.";
    if (/(payment|pay|credit|cash)/i.test(q)) return v.accepted_payment_methods?.length ? `Accepted payment methods: ${safeList(v.accepted_payment_methods)}` : "No payment info.";
    if (/(hours|open|close|opening|closing|time)/i.test(q)) {
      if (!v.opening_hours) return "No opening hours listed.";
      return "Opening Hours: " + JSON.stringify(v.opening_hours, null, 2);
    }
    if (/owner|contact person|manager|host/i.test(q)) {
      if (!v.owner_info) return "No owner information.";
      return "Owner/Contact:\n" + JSON.stringify(v.owner_info, null, 2);
    }
    if (/photo|image|gallery|picture/i.test(q)) return v.gallery_images?.length ? `There are ${v.gallery_images.length} gallery images.` : "There are no images for this venue.";
    if (/services|additional|extra|other/i.test(q)) return v.additional_services?.length ? `Additional services: ${safeList(v.additional_services)}` : "No additional services info.";
    if (/rules|regulation|polic(y|ies)|guideline|restriction/i.test(q)) {
      if (!v.rules_and_regulations) return "No rules or regulations available.";
      return "Rules & Regulations:\n" + JSON.stringify(v.rules_and_regulations, null, 2);
    }
    if (/type|venue type/i.test(q)) return v.type ? `Type: ${v.type}` : "No type specified.";
    if (/zip(code)?/.test(q)) return v.zipcode ? `Zipcode: ${v.zipcode}` : "No zipcode info.";
    if(/status/.test(q)) return v.status ? `Status: ${v.status}` : "No status info.";
    if (/description|about|detail/.test(q)) return v.description ? `Description: ${v.description}` : "No description available.";
    // show all fields if asked
    if (/all fields|all attributes|all info|full details|everything/i.test(q)) {
      let result = [];
      for (let key in v) {
        result.push(`${key}: ${typeof (v as any)[key] === "object" ? JSON.stringify((v as any)[key]) : (v as any)[key] ?? "null"}`);
      }
      return result.join("\n");
    }
    // fallback
    return `Please ask about this venue's name, address, price, categories, amenities, availability, contacts, type, etc.`;
  }

  const handleSendMessage = (customMessage?: string, options?: { viaMic?: boolean }) => {
    const messageText = customMessage || inputMessage;
    if (messageText.trim() === "" || chatbotState === "thinking") return;
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        sender: "user",
        content: messageText,
        timestamp: new Date(),
      },
    ]);
    setInputMessage("");
    setChatbotState("thinking");

    setTimeout(() => {
      const response = getVenueAnswer(messageText);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: "bot",
          content: response,
          timestamp: new Date(),
        },
      ]);
      setLastBotShouldSpeak(isSpeakerOn || !!options?.viaMic);
      setChatbotState("idle");
    }, 600);
  };

  useEffect(() => {
    if (
      lastBotShouldSpeak &&
      speechSynthesisSupported &&
      messages.length &&
      messages[messages.length - 1].sender === "bot"
    ) {
      speak(messages[messages.length - 1].content, () => setIsSpeaking(true), () => setIsSpeaking(false));
      setLastBotShouldSpeak(false);
    }
    // eslint-disable-next-line
  }, [messages, lastBotShouldSpeak, speechSynthesisSupported]);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed bottom-4 right-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl items-center justify-center border border-blue-500/20"
                aria-label="Venue Details Chatbot"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
            <p>
              {venue?.name
                ? `Ask about ${venue.name}`
                : "Venue Assistant"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[540px] h-[620px] p-0 overflow-hidden right-[5%] bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col rounded-xl border border-white/10">
          <DialogTitle className="sr-only">
            {venue?.name ? venue.name + " Assistant" : "Venue Assistant"}
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
          {/* Messages */}
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
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${message.sender === "user"
                        ? "bg-blue-600"
                        : "bg-findvenue-card-bg border border-findvenue-border"
                      }`}>
                      {message.sender === "user"
                        ? <User className="h-4 w-4" />
                        : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${message.sender === "user"
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
                  <div className="bg-findvenue-card-bg border-findvenue-border rounded-lg px-4 py-3">
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
                placeholder={venue?.name ? `Ask about ${venue.name}...` : "Ask me anything!"}
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
                ? `Ask about any detail or attribute of ${venue.name}!`
                : "Ask about any venue attribute you want!"}
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

export default VenueDetailsChatbot;

