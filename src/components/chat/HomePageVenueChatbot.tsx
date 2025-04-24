import React, { useState, useEffect, useRef } from "react";
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
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type Message = {
  id: string;
  sender: "user" | "bot";
  content: string;
  timestamp: Date;
};

// Extended venue type to match Supabase database fields
interface VenueWithDBFields extends Omit<Venue, 'description'> {
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

const SAUDI_CITIES = ['Riyadh', 'Jeddah', 'Khobar', 'Dammam', 'Mecca', 'Medina', 'Abha', 'Taif'];

const EVENT_CATEGORIES = [
  "Graduation party",
  "Training Course", 
  "Birthday",
  "Business Meeting",
  "Workshops",
  "Family Meeting"
];

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
  const getVenueAnswer = async (query: string): Promise<string> => {
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
    
    // Category/Type queries
    if (/category|type|kind|event type/i.test(query)) {
      let response = `${v.name} is suitable for the following event types:\n\n`;
      
      const categories = Array.isArray(v.category_name) 
        ? v.category_name
        : typeof v.category_name === 'string' 
          ? [v.category_name]
          : [];
          
      const types = v.type ? [v.type] : [];
      const allEventTypes = [...new Set([...categories, ...types])].filter(Boolean);
      
      if (allEventTypes.length > 0) {
        response += `<div class="space-y-2">`;
        allEventTypes.forEach(eventType => {
          response += `<div class="flex items-center gap-2">
            <span class="text-blue-400">•</span> ${eventType}
          </div>`;
        });
        response += `</div>`;
      } else {
        response += "No specific event types are listed for this venue.";
      }
      
      return response;
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
      if (query.toLowerCase().includes('cities') || query.toLowerCase().includes('locations')) {
        return `We have venues available across major cities in Saudi Arabia. You can search for venues in any city and filter by:
• Event type (wedding, conference, exhibition, etc.)
• Capacity needs
• Price range
• Required amenities

Would you like to explore venues in a specific city?`;
      }
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
    
    // Event type specific queries
    if (EVENT_CATEGORIES.some(category => 
        new RegExp(category.replace(/\s+/g, '\\s+'), 'i').test(query)
    )) {
      try {
        const matchedCategory = EVENT_CATEGORIES.find(category => 
          new RegExp(category.replace(/\s+/g, '\\s+'), 'i').test(query)
        );
        
        let baseQuery = supabase
          .from("venues")
          .select(`
            id,
            name,
            city_name,
            starting_price,
            min_capacity,
            max_capacity,
            type,
            currency,
            category_name,
            gallery_images,
            image_url,
            price_per_person,
            amenities,
            description,
            rating,
            reviews_count,
            additional_services
          `);

        // Add city filter if specified
        const cityMatch = new RegExp(SAUDI_CITIES.join('|'), 'i').exec(query);
        if (cityMatch) {
          baseQuery = baseQuery.ilike("city_name", `%${cityMatch[0]}%`);
        }

        // Filter for the specific category in both category_name and type fields
        baseQuery = baseQuery.or(
          `category_name.cs.{${matchedCategory}},type.ilike.%${matchedCategory}%`
        );

        const { data: venues, error } = await baseQuery
          .order('rating', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (!venues || venues.length === 0) {
          return `I couldn't find any venues${cityMatch ? ` in ${cityMatch[0]}` : ''} for ${matchedCategory}. Would you like to see venues for other event types?`;
        }

        let response = `<div class="mb-3 text-blue-300">Found ${venues.length} venues${cityMatch ? ` in ${cityMatch[0]}` : ''} perfect for ${matchedCategory}:</div>\n\n`;

        venues.forEach((venue, index) => {
          response += formatVenueCard(venue, index);
        });

        // Add suggestions for related event types
        response += `\n<div class="text-sm text-blue-300 mt-3">
          <p>Looking for other event types? Try:</p>
          <div class="flex flex-wrap gap-2 mt-2">
            ${EVENT_CATEGORIES
              .filter(cat => cat !== matchedCategory)
              .slice(0, 3)
              .map(cat => `<button class="text-blue-400 underline cursor-pointer" onclick="document.querySelector('input').value='Show me venues for ${cat}'; document.querySelector('button[aria-label=\\'Send\\']').click()">${cat}</button>`)
              .join(' • ')}
          </div>
        </div>`;

        return response;
      } catch (error) {
        console.error("Error fetching venues:", error);
        return "Sorry, I had trouble finding venues. Please try again or use the search function at the top of the page.";
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

  // Format a venue card for display in chat
  const formatVenueCard = (venue: any, index: number): string => {
    // Get up to 3 images for the gallery row
    const images = [];
    if (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) {
      for (let i = 0; i < Math.min(3, venue.gallery_images.length); i++) {
        images.push(venue.gallery_images[i]);
      }
    } else if (venue.image_url) {
      images.push(venue.image_url);
    } else {
      // Fallback placeholder image
      images.push("https://via.placeholder.com/300x200?text=No+Image");
    }
    
    // Format venue type info
    const venueType = venue.type || 'Venue';
    const categories = Array.isArray(venue.category_name) 
      ? venue.category_name.join(', ') 
      : (venue.category_name || '');
    
    // Get the correct price
    const price = venue.price_per_person || venue.starting_price || 0;
    const currency = venue.currency || 'SAR';
    const priceDisplay = `${price} ${currency}${venue.price_per_person ? '/person' : ''}`;
    
    // Build card HTML
    let card = `<div class="venue-card p-3 bg-blue-950/30 rounded-lg border border-blue-800/50 mb-4">\n`;
    
    // Title
    card += `<div class="font-semibold text-blue-300 text-lg mb-2">${index + 1}. ${venue.name}</div>\n`;
    
    // Images row
    card += `<div class="flex gap-1 mb-2">\n`;
    images.forEach(img => {
      card += `  <img src="${img}" alt="Venue" class="h-20 w-1/3 object-cover rounded" />\n`;
    });
    card += `</div>\n`;
    
    // Details
    card += `<div class="text-sm text-gray-300">\n`;
    card += `  <div><span class="text-blue-400">Type:</span> ${venueType}${categories ? ` (${categories})` : ''}</div>\n`;
    if (venue.city_name) {
      card += `  <div><span class="text-blue-400">Location:</span> ${venue.city_name}</div>\n`;
    }
    card += `  <div><span class="text-blue-400">Capacity:</span> ${venue.min_capacity || 0}-${venue.max_capacity || 0} guests</div>\n`;
    card += `  <div><span class="text-blue-400">Price:</span> ${priceDisplay}</div>\n`;
    card += `</div>\n`;
    
    // View details button
    card += `<div class="mt-2">\n`;
    card += `  <a class="text-blue-400 underline cursor-pointer" data-venue-id="${venue.id}" onclick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venue.id}'}))">View details for ${venue.name}</a>\n`;
    card += `</div>\n`;
    
    card += `</div>`;
    
    return card;
  };
  
  // Add this function to compare venues
  const compareVenues = async (venueNames: string[]): Promise<string> => {
    try {
      // Fetch venues data with all necessary fields
      const { data: venues, error } = await supabase
        .from("venues")
        .select("*")
        .in("name", venueNames);

      if (error) throw error;
      if (!venues || venues.length === 0) {
        return "I couldn't find the venues you mentioned. Please check the venue names and try again.";
      }

      // Create comparison table
      let response = `<div class="mb-4 text-blue-300">Detailed Comparison of ${venues.length} Venues:</div>\n\n`;
      response += `<div class="overflow-x-auto">\n<table class="w-full border-collapse">`;
      
      // Headers
      response += `<tr class="bg-blue-900/30">
        <th class="p-2 text-left border border-blue-800/30">Feature</th>
        ${venues.map(v => `<th class="p-2 text-left border border-blue-800/30">${v.name}</th>`).join('')}
      </tr>`;

      // Basic Information
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Type</span></td>
        ${venues.map(v => {
          const categories = Array.isArray(v.category_name) ? v.category_name.join(', ') : v.category_name;
          return `<td class="p-2 border border-blue-800/30">${v.type || 'Venue'}${categories ? ` (${categories})` : ''}</td>`;
        }).join('')}
      </tr>`;

      // Location
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Location</span></td>
        ${venues.map(v => `<td class="p-2 border border-blue-800/30">${v.address ? `${v.address}, ` : ''}${v.city_name || 'Not specified'}</td>`).join('')}
      </tr>`;

      // Pricing Details
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Pricing</span></td>
        ${venues.map(v => {
          let pricing = [];
          if (v.starting_price) pricing.push(`Starting at ${v.starting_price} ${v.currency || 'SAR'}`);
          if (v.price_per_person) pricing.push(`${v.price_per_person} ${v.currency || 'SAR'}/person`);
          return `<td class="p-2 border border-blue-800/30">${pricing.length ? pricing.join('<br/>') : 'Not specified'}</td>`;
        }).join('')}
      </tr>`;

      // Capacity
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Capacity</span></td>
        ${venues.map(v => `<td class="p-2 border border-blue-800/30">${v.min_capacity || 0} - ${v.max_capacity || 0} guests</td>`).join('')}
      </tr>`;

      // Rating & Reviews
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Rating</span></td>
        ${venues.map(v => `<td class="p-2 border border-blue-800/30">${v.rating ? `${v.rating}/5 (${v.reviews_count || 0} reviews)` : 'No ratings yet'}</td>`).join('')}
      </tr>`;

      // Amenities
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Amenities</span></td>
        ${venues.map(v => {
          const amenities = Array.isArray(v.amenities) ? v.amenities.join(' • ') : (v.amenities || 'None listed');
          return `<td class="p-2 border border-blue-800/30">${amenities}</td>`;
        }).join('')}
      </tr>`;

      // Additional Services
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Additional Services</span></td>
        ${venues.map(v => {
          const services = Array.isArray(v.additional_services) ? v.additional_services.join(' • ') : (v.additional_services || 'None listed');
          return `<td class="p-2 border border-blue-800/30">${services}</td>`;
        }).join('')}
      </tr>`;

      // Facilities
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Facilities</span></td>
        ${venues.map(v => {
          let facilities = [];
          if (v.wifi) facilities.push('WiFi');
          if (v.parking) facilities.push('Parking');
          return `<td class="p-2 border border-blue-800/30">${facilities.length ? facilities.join(' • ') : 'None listed'}</td>`;
        }).join('')}
      </tr>`;

      // Accessibility Features
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Accessibility</span></td>
        ${venues.map(v => {
          const features = Array.isArray(v.accessibility_features) ? v.accessibility_features.join(' • ') : (v.accessibility_features || 'None listed');
          return `<td class="p-2 border border-blue-800/30">${features}</td>`;
        }).join('')}
      </tr>`;

      // Payment Methods
      response += `<tr class="bg-blue-950/30">
        <td class="p-2 border border-blue-800/30"><span class="text-blue-400">Payment Methods</span></td>
        ${venues.map(v => {
          const methods = Array.isArray(v.accepted_payment_methods) ? v.accepted_payment_methods.join(' • ') : (v.accepted_payment_methods || 'Not specified');
          return `<td class="p-2 border border-blue-800/30">${methods}</td>`;
        }).join('')}
      </tr>`;

      response += `</table>\n</div>`;

      // Add descriptions section
      response += `\n<div class="mt-6 space-y-4">`;
      response += `<div class="text-blue-300">Venue Descriptions:</div>`;
      venues.forEach(venue => {
        response += `\n<div class="bg-blue-950/30 p-4 rounded-lg border border-blue-800/50">
          <div class="font-semibold text-blue-400">${venue.name}</div>
          <div class="mt-2 text-sm">${venue.description || 'No description available.'}</div>
        </div>`;
      });
      response += `</div>`;

      // Add venue links
      response += `\n<div class="mt-6 space-y-2">
        <div class="text-blue-300">View Full Details:</div>`;
      venues.forEach(venue => {
        response += `\n<div><a class="text-blue-400 underline cursor-pointer" data-venue-id="${venue.id}" onclick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venue.id}'}))">View complete details for ${venue.name}</a></div>`;
      });
      response += `</div>`;

      return response;
    } catch (error) {
      console.error("Error handling comparison:", error);
      return "Sorry, I had trouble processing your comparison request. Please try again.";
    }
  };

  // Add this helper function to handle wedding venue queries
  const getWeddingVenues = async (cityName?: string): Promise<string> => {
    try {
      let baseQuery = supabase
        .from("venues")
        .select("id, name, city_name, starting_price, min_capacity, max_capacity, type, currency, category_name, gallery_images, image_url, price_per_person, amenities");

      // Add wedding category filter
      baseQuery = baseQuery.or(
        'category_name.cs.{Wedding Venues},category_name.cs.{Wedding},type.ilike.%wedding%'
      );

      // Add city filter if specified
      if (cityName) {
        baseQuery = baseQuery.ilike('city_name', `%${cityName}%`);
      }

      // Get results ordered by rating and popularity
      const { data: venues, error } = await baseQuery
        .order('rating', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!venues || venues.length === 0) {
        return `I couldn't find any wedding venues${cityName ? ` in ${cityName}` : ''}. Would you like to see venues in another city?`;
      }

      let response = `<div class="mb-3 text-blue-300">Here are some wedding venues${cityName ? ` in ${cityName}` : ''} perfect for your special day:</div>\n\n`;

      venues.forEach((venue, index) => {
        // Get special wedding features
        const weddingFeatures = [
          venue.amenities?.includes('Bridal Suite') ? 'Bridal Suite' : null,
          venue.amenities?.includes('Catering') ? 'Catering Services' : null,
          venue.amenities?.includes('Parking') ? 'Parking Available' : null,
          venue.amenities?.includes('Sound System') ? 'Sound System' : null,
          venue.amenities?.includes('Lighting') ? 'Special Lighting' : null
        ].filter(Boolean);

        // Create enhanced venue card with wedding-specific details
        let card = `<div class="venue-card p-4 bg-blue-950/30 rounded-lg border border-blue-800/50 mb-4">\n`;
        
        // Title with special wedding icon
        card += `<div class="font-semibold text-blue-300 text-lg mb-2">💒 ${index + 1}. ${venue.name}</div>\n`;
        
        // Images row
        const images = (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) 
          ? venue.gallery_images.slice(0, 3) 
          : [venue.image_url || "https://via.placeholder.com/300x200?text=Wedding+Venue"];

        card += `<div class="flex gap-1 mb-3">\n`;
        images.forEach(img => {
          card += `  <img src="${img}" alt="Wedding Venue" class="h-24 w-1/3 object-cover rounded" />\n`;
        });
        card += `</div>\n`;
        
        // Details with wedding-specific information
        card += `<div class="text-sm text-gray-300 space-y-2">\n`;
        card += `  <div><span class="text-blue-400">Venue Type:</span> ${venue.type || 'Wedding Venue'}</div>\n`;
        if (venue.city_name) {
          card += `  <div><span class="text-blue-400">Location:</span> ${venue.city_name}</div>\n`;
        }
        card += `  <div><span class="text-blue-400">Capacity:</span> ${venue.min_capacity || 0}-${venue.max_capacity || 0} guests</div>\n`;
        
        // Price with wedding package note
        const price = venue.price_per_person || venue.starting_price;
        const currency = venue.currency || 'SAR';
        card += `  <div><span class="text-blue-400">Starting Price:</span> ${price} ${currency}${venue.price_per_person ? '/person' : ''}</div>\n`;
        
        // Wedding features
        if (weddingFeatures.length > 0) {
          card += `  <div><span class="text-blue-400">Wedding Features:</span> ${weddingFeatures.join(' • ')}</div>\n`;
        }
        
        card += `</div>\n`;
        
        // View details button
        card += `<div class="mt-3">\n`;
        card += `  <a class="text-blue-400 underline cursor-pointer" data-venue-id="${venue.id}" onclick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venue.id}'}))">View wedding packages and details for ${venue.name}</a>\n`;
        card += `</div>\n`;
        
        card += `</div>`;
        
        response += card;
      });

      response += `\n<div class="text-sm text-blue-300 mt-3">
        <p>💝 All wedding venues can be customized for your special day. Contact venues directly for:</p>
        <ul class="list-disc ml-5 mt-2">
          <li>Custom wedding packages</li>
          <li>Decoration options</li>
          <li>Catering menus</li>
          <li>Available dates</li>
        </ul>
      </div>`;

      return response;
    } catch (error) {
      console.error("Error fetching wedding venues:", error);
      return "Sorry, I had trouble finding wedding venues. Please try again or use the search function at the top of the page.";
    }
  };

  // Modify getDefaultAnswer to handle wedding venue queries
  const getDefaultAnswer = async (query: string): Promise<string> => {
    query = query.toLowerCase();
    
    // Event type specific queries - check this before other patterns
    if (EVENT_CATEGORIES.some(category => 
        new RegExp(category.replace(/\s+/g, '\\s+'), 'i').test(query)
    )) {
      try {
        const matchedCategory = EVENT_CATEGORIES.find(category => 
          new RegExp(category.replace(/\s+/g, '\\s+'), 'i').test(query)
        );
        
        let baseQuery = supabase
          .from("venues")
          .select(`
            id,
            name,
            city_name,
            starting_price,
            min_capacity,
            max_capacity,
            type,
            currency,
            category_name,
            gallery_images,
            image_url,
            price_per_person,
            amenities,
            description,
            rating,
            reviews_count,
            additional_services
          `);

        // Add city filter if specified
        const cityMatch = new RegExp(SAUDI_CITIES.join('|'), 'i').exec(query);
        if (cityMatch) {
          baseQuery = baseQuery.ilike("city_name", `%${cityMatch[0]}%`);
        }

        // Filter for the specific category in both category_name and type fields
        baseQuery = baseQuery.or(
          `category_name.cs.{${matchedCategory}},type.ilike.%${matchedCategory}%`
        );

        const { data: venues, error } = await baseQuery
          .order('rating', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (!venues || venues.length === 0) {
          return `I couldn't find any venues${cityMatch ? ` in ${cityMatch[0]}` : ''} for ${matchedCategory}. Would you like to see venues for other event types?`;
        }

        let response = `<div class="mb-3 text-blue-300">Found ${venues.length} venues${cityMatch ? ` in ${cityMatch[0]}` : ''} perfect for ${matchedCategory}:</div>\n\n`;

        venues.forEach((venue, index) => {
          response += formatVenueCard(venue, index);
        });

        // Add suggestions for related event types
        response += `\n<div class="text-sm text-blue-300 mt-3">
          <p>Looking for other event types? Try:</p>
          <div class="flex flex-wrap gap-2 mt-2">
            ${EVENT_CATEGORIES
              .filter(cat => cat !== matchedCategory)
              .slice(0, 3)
              .map(cat => `<button class="text-blue-400 underline cursor-pointer" onclick="document.querySelector('input').value='Show me venues for ${cat}'; document.querySelector('button[aria-label=\\'Send\\']').click()">${cat}</button>`)
              .join(' • ')}
          </div>
        </div>`;

        return response;
      } catch (error) {
        console.error("Error fetching venues:", error);
        return "Sorry, I had trouble finding venues. Please try again or use the search function at the top of the page.";
      }
    }

    // Handle wedding venue queries
    if (/wedding|marriage|bride|groom|hall|قاعة|عرس|زفاف|زواج|عروس/i.test(query)) {
      try {
        let baseQuery = supabase
          .from("venues")
          .select(`
            id,
            name,
            city_name,
            starting_price,
            min_capacity,
            max_capacity,
            type,
            currency,
            category_name,
            gallery_images,
            image_url,
            price_per_person,
            amenities,
            description,
            rating,
            reviews_count,
            additional_services,
            rules_and_regulations,
            owner_info
          `);

        // Check for city mention
        const cityMatch = /(riyadh|jeddah|khobar|dammam|mecca|medina|جدة|مكة|الرياض|الخبر|الدمام|المدينة)/i.exec(query);
        if (cityMatch) {
          baseQuery = baseQuery.ilike('city_name', `%${cityMatch[0]}%`);
        }

        // Get results ordered by rating and popularity
        const { data: venues, error } = await baseQuery
          .order('rating', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (!venues || venues.length === 0) {
          return `I couldn't find any venues${cityMatch ? ` in ${cityMatch[0]}` : ''}. Would you like to see venues in another city?`;
        }

        let response = `<div class="mb-3 text-blue-300">Here are venues${cityMatch ? ` in ${cityMatch[0]}` : ''}:</div>\n\n`;

        venues.forEach((venue, index) => {
          let card = `<div class="venue-card p-4 bg-blue-950/30 rounded-lg border border-blue-800/50 mb-4">\n`;
          
          // Title
          card += `<div class="font-semibold text-blue-300 text-lg mb-2">${index + 1}. ${venue.name}</div>\n`;
          
          // Images row - use only provided images
          const images = (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) 
            ? venue.gallery_images.slice(0, 3) 
            : [venue.image_url].filter(Boolean);

          if (images.length > 0) {
            card += `<div class="flex gap-1 mb-3">\n`;
            images.forEach(img => {
              card += `  <img src="${img}" alt="${venue.name}" class="h-24 w-1/3 object-cover rounded" />\n`;
            });
            card += `</div>\n`;
          }
          
          // Details using only available fields
          card += `<div class="text-sm text-gray-300 space-y-2">\n`;
          
          // Type & Categories
          if (venue.type || venue.category_name) {
            card += `  <div><span class="text-blue-400">Type:</span> ${venue.type || ''}${
              venue.category_name ? ` (${Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.category_name})` : ''
            }</div>\n`;
          }

          // Location
          if (venue.city_name) {
            card += `  <div><span class="text-blue-400">Location:</span> ${venue.city_name}</div>\n`;
          }

          // Capacity
          if (venue.min_capacity !== null || venue.max_capacity !== null) {
            card += `  <div><span class="text-blue-400">Capacity:</span> ${venue.min_capacity || 0}-${venue.max_capacity || 0} guests</div>\n`;
          }
          
          // Price
          if (venue.starting_price !== null || venue.price_per_person !== null) {
            const price = venue.price_per_person || venue.starting_price;
            const currency = venue.currency || 'SAR';
            card += `  <div><span class="text-blue-400">Price:</span> ${price} ${currency}${venue.price_per_person ? '/person' : ''}</div>\n`;
          }
          
          // Amenities
          if (Array.isArray(venue.amenities) && venue.amenities.length > 0) {
            card += `  <div><span class="text-blue-400">Amenities:</span> ${venue.amenities.join(' • ')}</div>\n`;
          }

          // Additional Services
          if (Array.isArray(venue.additional_services) && venue.additional_services.length > 0) {
            card += `  <div><span class="text-blue-400">Additional Services:</span> ${venue.additional_services.join(' • ')}</div>\n`;
          }

          // Rating
          if (venue.rating !== null) {
            card += `  <div><span class="text-blue-400">Rating:</span> ${venue.rating}/5${
              venue.reviews_count ? ` (${venue.reviews_count} reviews)` : ''
            }</div>\n`;
          }
          
          card += `</div>\n`;
          
          // Description
          if (venue.description) {
            card += `<div class="mt-2 text-sm text-gray-400">${venue.description}</div>\n`;
          }
          
          // View details button
          card += `<div class="mt-3">\n`;
          card += `  <a class="text-blue-400 underline cursor-pointer" data-venue-id="${venue.id}" onclick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venue.id}'}))">View details for ${venue.name}</a>\n`;
          card += `</div>\n`;
          
          card += `</div>`;
          
          response += card;
        });

        return response;
      } catch (error) {
        console.error("Error fetching venues:", error);
        return "Sorry, I had trouble finding venues. Please try again or use the search function at the top of the page.";
      }
    }

    // Handle comparison requests
    if (/compare|comparison|vs|versus|difference between/i.test(query)) {
      try {
        // Get all venue names from the database for matching
        const { data: allVenues } = await supabase
          .from("venues")
          .select("name")
          .order("name");

        const venueNames = allVenues?.map(v => v.name.toLowerCase()) || [];
        const mentionedVenues: string[] = [];

        // Find mentioned venue names in the query
        allVenues?.forEach(venue => {
          if (query.toLowerCase().includes(venue.name.toLowerCase())) {
            mentionedVenues.push(venue.name);
          }
        });

        if (mentionedVenues.length < 2) {
          // If no specific venues mentioned, explain how to use comparison
          let response = "I can help you compare venues! Please mention the venue names you want to compare. For example:\n\n";
          response += "- Compare [Venue A] and [Venue B]\n";
          response += "- What's the difference between [Venue A] and [Venue B]\n";
          response += "- Show comparison of [Venue A], [Venue B], and [Venue C]\n\n";
          
          // Suggest some venues
          if (allVenues && allVenues.length > 0) {
            response += "Here are some venues you can compare:\n";
            allVenues.slice(0, 5).forEach(venue => {
              response += `- ${venue.name}\n`;
            });
          }
          
          return response;
        }

        // Compare the mentioned venues
        return await compareVenues(mentionedVenues);
      } catch (error) {
        console.error("Error handling comparison:", error);
        return "Sorry, I had trouble processing your comparison request. Please try again.";
      }
    }

    // Cities query
    if (query.includes('cities') || (query.includes('where') && query.includes('venues'))) {
      try {
        // Get all venues and group by city
        const { data: cityVenues, error: cityVenuesError } = await supabase
          .from('venues')
          .select('city_name, starting_price, price_per_person');

        if (cityVenuesError) throw cityVenuesError;

        // Create a map of cities with price ranges
        const cityPriceRanges: { [key: string]: { min: number, max: number, count: number } } = {};
        
        cityVenues.forEach(venue => {
          const city = venue.city_name || 'Unknown';
          if (!cityPriceRanges[city]) {
            cityPriceRanges[city] = { min: Infinity, max: -Infinity, count: 0 };
          }
          
          const price = venue.starting_price || venue.price_per_person || 0;
          if (price > 0) {
            cityPriceRanges[city].min = Math.min(cityPriceRanges[city].min, price);
            cityPriceRanges[city].max = Math.max(cityPriceRanges[city].max, price);
          }
          cityPriceRanges[city].count++;
        });

        // Format the response with price ranges
        let response = `<div class="text-blue-300 mb-4">Here are our available cities with venue price ranges:</div>\n\n`;
        
        Object.entries(cityPriceRanges)
          .sort(([, a], [, b]) => b.count - a.count)
          .forEach(([city, info]) => {
            if (city !== 'Unknown' && info.count > 0) {
              const minPrice = info.min === Infinity ? 0 : info.min;
              const maxPrice = info.max === -Infinity ? 0 : info.max;
              response += `<div class="mb-2">
                <span class="text-blue-400 font-semibold">${city}</span>: ${info.count} venues
                ${minPrice || maxPrice ? `\n<div class="text-sm ml-4">Price range: ${minPrice}-${maxPrice} SAR</div>` : ''}
              </div>`;
            }
          });

        response += `\n<div class="text-sm text-blue-300 mt-4">You can search for venues in any city with specific price ranges. For example, try "Show me venues under 30 SAR in Riyadh"</div>`;
        return response;
      } catch (error) {
        console.error('Error fetching cities:', error);
        return "I apologize, but I encountered an error while fetching the city information. Please try again later.";
      }
    }

    // Price range query
    const priceMatch = query.match(/(?:under|below|less than|maximum|max)\s*(\d+)\s*(?:sar|riyal)/i);
    const cityMatch = new RegExp(SAUDI_CITIES.join('|'), 'i').exec(query);
    
    if (priceMatch) {
      try {
        const maxPrice = parseInt(priceMatch[1]);
        
        // Query all relevant fields from database
        let baseQuery = supabase
          .from("venues")
          .select(`
            id,
            name,
            city_name,
            starting_price,
            min_capacity,
            max_capacity,
            type,
            currency,
            category_name,
            gallery_images,
            image_url,
            price_per_person,
            amenities,
            description,
            rating,
            reviews_count,
            additional_services
          `);

        // Add city filter if specified
        if (cityMatch) {
          baseQuery = baseQuery.ilike("city_name", `%${cityMatch[0]}%`);
        }

        // Filter for venues where either price is under the max
        baseQuery = baseQuery.or(
          `starting_price.lte.${maxPrice},` +
          `price_per_person.lte.${maxPrice}`
        );

        // Get the results
        const { data: venues, error } = await baseQuery
          .order('starting_price', { ascending: true, nullsLast: true })
          .order('price_per_person', { ascending: true, nullsLast: true })
          .limit(20);

        if (error) throw error;

        // Filter venues client-side to ensure we have valid prices under the limit
        const filteredVenues = (venues || []).filter(venue => {
          const startingPrice = typeof venue.starting_price === 'number' ? venue.starting_price : Infinity;
          const perPersonPrice = typeof venue.price_per_person === 'number' ? venue.price_per_person : Infinity;
          const lowestPrice = Math.min(startingPrice, perPersonPrice);
          return lowestPrice !== Infinity && lowestPrice <= maxPrice;
        });

        if (!filteredVenues.length) {
          // If no venues found, get the minimum available price to suggest
          const { data: minPriceData } = await supabase
            .from("venues")
            .select("starting_price, price_per_person")
            .order('starting_price', { ascending: true })
            .limit(10);

          let minAvailablePrice = Infinity;
          if (minPriceData) {
            minPriceData.forEach(venue => {
              const startingPrice = typeof venue.starting_price === 'number' ? venue.starting_price : Infinity;
              const perPersonPrice = typeof venue.price_per_person === 'number' ? venue.price_per_person : Infinity;
              minAvailablePrice = Math.min(minAvailablePrice, startingPrice, perPersonPrice);
            });
          }

          let response = `I couldn't find any venues${cityMatch ? ` in ${cityMatch[0]}` : ''} with prices under ${maxPrice} SAR.`;
          if (minAvailablePrice !== Infinity) {
            response += ` The lowest priced venue starts at ${minAvailablePrice} SAR. Would you like to see venues in that price range?`;
          }
          return response;
        }

        let response = `<div class="mb-3 text-blue-300">Found ${filteredVenues.length} venues${cityMatch ? ` in ${cityMatch[0]}` : ''} with prices under ${maxPrice} SAR:</div>\n\n`;

        filteredVenues.forEach((venue, index) => {
          let card = `<div class="venue-card p-4 bg-blue-950/30 rounded-lg border border-blue-800/50 mb-4">\n`;
          
          // Title
          card += `<div class="font-semibold text-blue-300 text-lg mb-2">${index + 1}. ${venue.name}</div>\n`;
          
          // Images
          const images = (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) 
            ? venue.gallery_images.slice(0, 3) 
            : [venue.image_url].filter(Boolean);

          if (images.length > 0) {
            card += `<div class="flex gap-1 mb-3">\n`;
            images.forEach(img => {
              card += `  <img src="${img}" alt="${venue.name}" class="h-24 w-1/3 object-cover rounded" />\n`;
            });
            card += `</div>\n`;
          }
          
          // Details
          card += `<div class="text-sm text-gray-300 space-y-2">\n`;
          
          // Type & Categories
          if (venue.type || venue.category_name) {
            card += `  <div><span class="text-blue-400">Type:</span> ${venue.type || ''}${
              venue.category_name ? ` (${Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.category_name})` : ''
            }</div>\n`;
          }

          // Location
          if (venue.city_name) {
            card += `  <div><span class="text-blue-400">Location:</span> ${venue.city_name}</div>\n`;
          }

          // Capacity
          if (venue.min_capacity !== null || venue.max_capacity !== null) {
            card += `  <div><span class="text-blue-400">Capacity:</span> ${venue.min_capacity || 0}-${venue.max_capacity || 0} guests</div>\n`;
          }
          
          // Price
          if (venue.starting_price !== null || venue.price_per_person !== null) {
            const price = venue.price_per_person || venue.starting_price;
            const currency = venue.currency || 'SAR';
            card += `  <div><span class="text-blue-400">Price:</span> ${price} ${currency}${venue.price_per_person ? '/person' : ''}</div>\n`;
          }
          
          // Amenities
          if (Array.isArray(venue.amenities) && venue.amenities.length > 0) {
            card += `  <div><span class="text-blue-400">Amenities:</span> ${venue.amenities.join(' • ')}</div>\n`;
          }

          // Additional Services
          if (Array.isArray(venue.additional_services) && venue.additional_services.length > 0) {
            card += `  <div><span class="text-blue-400">Additional Services:</span> ${venue.additional_services.join(' • ')}</div>\n`;
          }

          // Rating
          if (venue.rating !== null) {
            card += `  <div><span class="text-blue-400">Rating:</span> ${venue.rating}/5${
              venue.reviews_count ? ` (${venue.reviews_count} reviews)` : ''
            }</div>\n`;
          }
          
          // Description
          if (venue.description) {
            card += `<div class="mt-2 text-sm text-gray-400">${venue.description}</div>\n`;
          }
          
          // View details button
          card += `<div class="mt-3">\n`;
          card += `  <a class="text-blue-400 underline cursor-pointer" data-venue-id="${venue.id}" onclick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venue.id}'}))">View details for ${venue.name}</a>\n`;
          card += `</div>\n`;
          
          card += `</div>`;
          
          response += card;
        });

        return response;
      } catch (error) {
        console.error("Venue search error:", error);
        return "Sorry, I had trouble finding venues. Please try again or use the search function at the top of the page.";
      }
    }

    // Venue listing requests
    if (/list|show|find|search|display|browse|get/i.test(query) && 
        (/venue|hall|space|location|place/i.test(query) || 
         /riyadh|jeddah|khobar|dammam|mecca|medina/i.test(query))) {
      
      // City detection
      let city = "riyadh"; // Default
      if (/riyadh/i.test(query)) city = "riyadh";
      else if (/jeddah/i.test(query)) city = "jeddah";
      else if (/khobar/i.test(query)) city = "khobar";
      else if (/dammam/i.test(query)) city = "dammam";
      else if (/mecca|makkah/i.test(query)) city = "mecca";
      else if (/medina|madinah/i.test(query)) city = "medina";
      
      try {
        // Get venues from Supabase with gallery images
        let baseQuery = supabase
          .from("venues")
          .select("id, name, city_name, starting_price, min_capacity, max_capacity, type, currency, category_name, gallery_images, image_url")
          .ilike("city_name", `%${city}%`);
          
        // Check for capacity queries
        const capacityMatch = query.match(/(\d+)\s*(people|guests|persons)/i);
        const minCapacityMatch = query.match(/(?:more than|at least|minimum|min|>)\s*(\d+)/i);
          
        if (capacityMatch) {
          const capacity = parseInt(capacityMatch[1]);
          // Updated capacity filter: venue's max capacity must be >= requested capacity
          baseQuery = baseQuery.gte("max_capacity", capacity);
        } else if (minCapacityMatch) {
          const minCapacity = parseInt(minCapacityMatch[1]);
          baseQuery = baseQuery.gte("max_capacity", minCapacity);
        }
        
        const { data: venues, error } = await baseQuery.limit(5);
        
        if (error) throw error;
        
        if (!venues || venues.length === 0) {
          return `I couldn't find any venues in ${city}${capacityMatch ? ` for ${capacityMatch[1]} guests` : ''}${minCapacityMatch ? ` with more than ${minCapacityMatch[1]} guests capacity` : ''}. Please try searching for another city or capacity range, or use the search function at the top of the page.`;
        }
        
        // Format venue list with cards
        let response = `<div class="mb-3 text-blue-300">Here are some venues in ${city.charAt(0).toUpperCase() + city.slice(1)}${capacityMatch ? ` for ${capacityMatch[1]} guests` : ''}${minCapacityMatch ? ` with more than ${minCapacityMatch[1]} guests capacity` : ''}:</div>\n\n`;
        
        venues.forEach((venue, index) => {
          response += formatVenueCard(venue, index);
        });
        
        response += "\n<div class='text-sm text-blue-300 mt-2'>Click on any venue to see complete details!</div>";
        return response;
      } catch (error) {
        console.error("Venue search error:", error);
        return "Sorry, I had trouble finding venues. Please use the search function at the top of the page or try again later.";
      }
    }
    
    // Handle capacity queries without city
    const capacityQueryMatch = query.match(/(\d+)\s*(people|guests|persons)/i);
    const minCapacityMatch = query.match(/(?:more than|at least|minimum|min|>)\s*(\d+)/i);
    
    if (capacityQueryMatch || minCapacityMatch) {
      try {
        let baseQuery = supabase
          .from("venues")
          .select("id, name, city_name, starting_price, min_capacity, max_capacity, type, currency, category_name, gallery_images, image_url");
        
        if (capacityQueryMatch) {
          const capacity = parseInt(capacityQueryMatch[1]);
          baseQuery = baseQuery.gte("min_capacity", 0).lte("max_capacity", capacity);
        } else if (minCapacityMatch) {
          const minCapacity = parseInt(minCapacityMatch[1]);
          baseQuery = baseQuery.gte("max_capacity", minCapacity);
        }
        
        const { data: venues, error } = await baseQuery.limit(5);
        
        if (error) throw error;
        
        if (!venues || venues.length === 0) {
          return `I couldn't find any venues${capacityQueryMatch ? ` for ${capacityQueryMatch[1]} guests` : ''}${minCapacityMatch ? ` with more than ${minCapacityMatch[1]} guests capacity` : ''}. Please try a different capacity range or other search criteria.`;
        }
        
        // Format venue list
        let capacityPhrase = "";
        if (capacityQueryMatch) capacityPhrase = ` for ${capacityQueryMatch[1]} guests`;
        if (minCapacityMatch) capacityPhrase = ` with more than ${minCapacityMatch[1]} guests capacity`;
        
        let response = `<div class="mb-3 text-blue-300">Here are some venues${capacityPhrase}:</div>\n\n`;
        
        venues.forEach((venue, index) => {
          response += formatVenueCard(venue, index);
        });
        
        response += "\n<div class='text-sm text-blue-300 mt-2'>Click on any venue to see complete details!</div>";
        return response;
      } catch (error) {
        console.error("Venue search error:", error);
        return "Sorry, I had trouble finding venues. Please use the search function at the top of the page or try again later.";
      }
    }
    
    // Booking process explanation
    if (/process|how to|steps|procedure|guideline|book|reserve|booking/i.test(query)) {
      return `The booking process on FindVenue is simple:\n\n1. Browse or search for venues that meet your requirements\n2. View venue details, photos, pricing, and availability\n3. Select your preferred date and time slot\n4. Fill out the booking form with your event details\n5. Make a deposit payment to secure your booking\n6. Receive confirmation from the venue owner\n\nYou can manage all your bookings from your account dashboard. Need more help with a specific part of the process?`;
    }
    
    // Payment related
    if (/payment|pay|cost|price|fee|deposit|refund|cancel/i.test(query)) {
      return "Most venues require a deposit payment to secure your booking. Payment methods vary by venue but typically include credit/debit cards, bank transfers, and sometimes cash. Cancellation policies are set by each venue owner and are displayed on the venue details page. Would you like to know more about pricing or payment options?";
    }
    
    // Event type specific
    if (/conference|meeting|business|corporate|workshop/i.test(query)) {
      return "For business events, we offer professional conference venues with amenities like projectors, sound systems, and high-speed internet. Many venues also provide catering services for business lunches or coffee breaks. Try searching for 'conference rooms' or 'meeting spaces'. Would you like to see venue options for a specific city?";
    }
    
    if (/party|celebration|birthday|anniversary/i.test(query)) {
      return "Looking for a celebration venue? We have many options for parties and special occasions. Most party venues offer decoration services, sound systems, and catering options. You can filter venues by capacity to ensure they can accommodate your guest list. Would you like me to suggest some popular party venues?";
    }
    
    // Location specific
    if (/location|city|area|region|neighborhood/i.test(query)) {
      return "We have venues across multiple cities in Saudi Arabia, including Riyadh, Jeddah, Khobar, Dammam, Mecca, and Medina. You can use our location filter to find venues in your preferred area. Which city are you interested in?";
    }
    
    // Help/Support
    if (/help|support|contact|assistance/i.test(query)) {
      return "Need help? You can contact our support team through the 'Contact Us' link in the footer, or email support@findvenue.com. We're available 7 days a week from 9 AM to 9 PM to assist with any questions about venues, bookings, or your account.";
    }
    
    // General venue inquiry
    if (/venue|find|help/i.test(query)) {
      return "You can search for venues based on location, capacity, event type, and price range. Our platform offers detailed information about each venue, including photos, amenities, and reviews. Would you like me to help you find a specific type of venue?";
    }
    
    // Capacity query
    const capacityMatch = query.match(/(?:capacity|fit|accommodate|hold|guests?|people)\s*(?:of|for)?\s*(\d+)/i);

    if (capacityMatch) {
      try {
        const requiredCapacity = parseInt(capacityMatch[1]);
        
        // Query all relevant fields from database
        let baseQuery = supabase
          .from("venues")
          .select(`
            id,
            name,
            city_name,
            starting_price,
            min_capacity,
            max_capacity,
            type,
            currency,
            category_name,
            gallery_images,
            image_url,
            price_per_person,
            amenities,
            description,
            rating,
            reviews_count,
            additional_services
          `);

        // Add city filter if specified
        const cityMatch = new RegExp(SAUDI_CITIES.join('|'), 'i').exec(query);
        if (cityMatch) {
          baseQuery = baseQuery.ilike("city_name", `%${cityMatch[0]}%`);
        }

        // Filter for venues that can accommodate the required capacity
        baseQuery = baseQuery.and(
          `min_capacity.lte.${requiredCapacity},` +
          `max_capacity.gte.${requiredCapacity}`
        );

        // Get the results
        const { data: venues, error } = await baseQuery
          .order('rating', { ascending: false, nullsLast: true })
          .limit(20);

        if (error) throw error;

        if (!venues || venues.length === 0) {
          // If no venues found, get the closest available capacity ranges
          const { data: capacityRanges } = await supabase
            .from("venues")
            .select("min_capacity, max_capacity")
            .order('max_capacity', { ascending: true })
            .limit(10);

          let suggestedRange = null;
          if (capacityRanges) {
            for (const venue of capacityRanges) {
              if (venue.max_capacity >= requiredCapacity) {
                suggestedRange = venue;
                break;
              }
            }
          }

          let response = `I couldn't find any venues${cityMatch ? ` in ${cityMatch[0]}` : ''} that can accommodate exactly ${requiredCapacity} guests.`;
          if (suggestedRange) {
            response += ` However, I found venues that can accommodate between ${suggestedRange.min_capacity} and ${suggestedRange.max_capacity} guests. Would you like to see those options?`;
          }
          return response;
        }

        let response = `<div class="mb-3 text-blue-300">Found ${venues.length} venues${cityMatch ? ` in ${cityMatch[0]}` : ''} that can accommodate ${requiredCapacity} guests:</div>\n\n`;

        venues.forEach((venue, index) => {
          let card = `<div class="venue-card p-4 bg-blue-950/30 rounded-lg border border-blue-800/50 mb-4">\n`;
          
          // Title
          card += `<div class="font-semibold text-blue-300 text-lg mb-2">${index + 1}. ${venue.name}</div>\n`;
          
          // Images
          const images = (Array.isArray(venue.gallery_images) && venue.gallery_images.length > 0) 
            ? venue.gallery_images.slice(0, 3) 
            : [venue.image_url].filter(Boolean);

          if (images.length > 0) {
            card += `<div class="flex gap-1 mb-3">\n`;
            images.forEach(img => {
              card += `  <img src="${img}" alt="${venue.name}" class="h-24 w-1/3 object-cover rounded" />\n`;
            });
            card += `</div>\n`;
          }
          
          // Details
          card += `<div class="text-sm text-gray-300 space-y-2">\n`;
          
          // Type & Categories
          if (venue.type || venue.category_name) {
            card += `  <div><span class="text-blue-400">Type:</span> ${venue.type || ''}${
              venue.category_name ? ` (${Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.category_name})` : ''
            }</div>\n`;
          }

          // Location
          if (venue.city_name) {
            card += `  <div><span class="text-blue-400">Location:</span> ${venue.city_name}</div>\n`;
          }

          // Capacity
          if (venue.min_capacity !== null || venue.max_capacity !== null) {
            card += `  <div><span class="text-blue-400">Capacity:</span> ${venue.min_capacity || 0}-${venue.max_capacity || 0} guests</div>\n`;
          }
          
          // Price
          if (venue.starting_price !== null || venue.price_per_person !== null) {
            const price = venue.price_per_person || venue.starting_price;
            const currency = venue.currency || 'SAR';
            card += `  <div><span class="text-blue-400">Price:</span> ${price} ${currency}${venue.price_per_person ? '/person' : ''}</div>\n`;
          }
          
          // Amenities
          if (Array.isArray(venue.amenities) && venue.amenities.length > 0) {
            card += `  <div><span class="text-blue-400">Amenities:</span> ${venue.amenities.join(' • ')}</div>\n`;
          }

          // Additional Services
          if (Array.isArray(venue.additional_services) && venue.additional_services.length > 0) {
            card += `  <div><span class="text-blue-400">Additional Services:</span> ${venue.additional_services.join(' • ')}</div>\n`;
          }

          // Rating
          if (venue.rating !== null) {
            card += `  <div><span class="text-blue-400">Rating:</span> ${venue.rating}/5${
              venue.reviews_count ? ` (${venue.reviews_count} reviews)` : ''
            }</div>\n`;
          }
          
          card += `</div>\n`;
          
          // Description
          if (venue.description) {
            card += `<div class="mt-2 text-sm text-gray-400">${venue.description}</div>\n`;
          }
          
          // View details button
          card += `<div class="mt-3">\n`;
          card += `  <a class="text-blue-400 underline cursor-pointer" data-venue-id="${venue.id}" onclick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venue.id}'}))">View details for ${venue.name}</a>\n`;
          card += `</div>\n`;
          
          card += `</div>`;
          
          response += card;
        });

        return response;
      } catch (error) {
        console.error("Venue search error:", error);
        return "Sorry, I had trouble finding venues. Please try again or use the search function at the top of the page.";
      }
    }

    return "I'm your assistant for Avnu! I can help you find venues, explain the booking process, or answer questions about our platform features. What specific information are you looking for today?";
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
      const resp = venue 
        ? await getVenueAnswer(messageText) 
        : await getDefaultAnswer(messageText);
      
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
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          sender: "bot",
          content: "Sorry, something went wrong while processing your request. Please try again.",
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

  useEffect(() => {
    const handleVenueNavigation = (event: CustomEvent) => {
      const venueId = event.detail;
      if (venueId) {
        navigate(`/venue/${venueId}`);
      }
    };

    document.addEventListener('navigateToVenue', handleVenueNavigation as EventListener);
    
    return () => {
      document.removeEventListener('navigateToVenue', handleVenueNavigation as EventListener);
    };
  }, [navigate]);

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
                : "Avnu Home Assistant"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[540px] h-[620px] p-0 overflow-hidden right-[5%] bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col rounded-xl border border-white/10 z-[1002]">
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-900 to-blue-800 flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <DialogTitle className="text-white font-medium m-0">
              {venue?.name ? venue.name + " Assistant" : "Avnu Assistant"}
            </DialogTitle>
          </div>
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
                      {message.sender === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap venue-chat-content">
                          {message.content.includes("<div") || message.content.includes("<img") ? (
                            <div 
                              dangerouslySetInnerHTML={{
                                __html: message.content.replace(
                                  /onclick="document\.dispatchEvent\(new CustomEvent\('navigateToVenue', \{detail: '(.+?)'\}\)\)"/g,
                                  (match, venueId) => `onClick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venueId}'}))"` 
                                )
                              }}
                            />
                          ) : (
                            <p 
                              dangerouslySetInnerHTML={{
                                __html: message.content.replace(
                                  /\[View details for (.+?)\]\(\/venue\/(.+?)\)/g,
                                  (match, venueName, venueId) => 
                                    `<span class="text-blue-400 underline cursor-pointer" 
                                      data-venue-id="${venueId}" 
                                      onClick="document.dispatchEvent(new CustomEvent('navigateToVenue', {detail: '${venueId}'}))">
                                      View details for ${venueName}
                                    </span>`
                                )
                              }}
                            />
                          )}
                        </div>
                      )}
                      {message.sender === "bot" && speechSynthesisSupported && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => speak(message.content.replace(/<[^>]*>/g, ''))}
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

            {/* Suggested Prompts */}
            <div className="mt-4 space-y-2">
              <p className="text-xs text-findvenue-text-muted mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {venue ? (
                  // Venue-specific prompts
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("Tell me more about this venue")}
                    >
                      Tell me more about this venue
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("What's the capacity?")}
                    >
                      What's the capacity?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("Show me the pricing details")}
                    >
                      Show pricing details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("What amenities are available?")}
                    >
                      Available amenities
                    </Button>
                  </>
                ) : (
                  // General prompts
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("Show me wedding venues in Riyadh")}
                    >
                      Wedding venues in Riyadh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("Find venues for 50 people")}
                    >
                      Venues for 50 people
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("Compare venues")}
                    >
                      Compare venues
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-950/50 hover:bg-blue-900/50"
                      onClick={() => handleSendMessage("What cities do you have venues in?")}
                    >
                      Available cities
                    </Button>
                  </>
                )}
              </div>
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
