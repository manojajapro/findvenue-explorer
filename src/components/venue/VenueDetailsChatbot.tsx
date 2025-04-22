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
import { useToast } from '@/components/ui/use-toast';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
};

type ChatbotState = 'idle' | 'thinking' | 'error';

const CHAT_STORAGE_KEY_PREFIX = 'venueDetailsAssistant_';
const MAX_STORED_MESSAGES = 50; // Maximum number of messages to store in local storage

// Extended type to support both model properties and direct DB fields
interface VenueWithDBFields extends Venue {
  // Direct database fields from Supabase
  category_name?: string[] | string;
  min_capacity?: number;
  max_capacity?: number;
  starting_price?: number;
  price_per_person?: number;
  reviews_count?: number;
  accessibility_features?: string[];
  accepted_payment_methods?: string[];
  opening_hours?: Record<string, { open: string; close: string; }>;
  additional_services?: string[];
  rules_and_regulations?: Array<{
    title: string;
    description: string;
    category?: string;
  }>;
}

interface VenueDetailsChatbotProps {
  venue: VenueWithDBFields;
}

const VenueDetailsChatbot: React.FC<VenueDetailsChatbotProps> = ({ venue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      sender: 'bot',
      content: `Hello! I'm your assistant for ${venue.name}. Ask me anything about this venue!`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatbotState, setChatbotState] = useState<ChatbotState>('idle');
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [lastBotShouldSpeak, setLastBotShouldSpeak] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatStorageKey = `${CHAT_STORAGE_KEY_PREFIX}${venue.id}`;

  const { speak, stop, isSupported: speechSynthesisSupported } = useSpeechSynthesis();
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const { startListening, stopListening, isSupported: speechRecognitionSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setInputMessage(transcript);
      setIsListening(false);
      if (transcript) {
        handleSendMessage(transcript, { viaMic: true });
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
    try {
      const storedChat = localStorage.getItem(chatStorageKey);
      if (storedChat) {
        const parsedChat = JSON.parse(storedChat).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedChat);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [chatStorageKey]);

  useEffect(() => {
    if (messages.length > 1) { // Don't save if it's just the initial greeting
      try {
        const messagesToStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(chatStorageKey, JSON.stringify(messagesToStore));
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }
  }, [messages, chatStorageKey]);

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

  const isArabicText = (text: string): boolean => {
    return /[\u0600-\u06FF]/.test(text);
  };

  const generateDetailedResponse = (venue: VenueWithDBFields): string => {
    const useArabic = isArabicText(venue.name);
    
    if (useArabic) {
      let response = `${venue.name} هي قاعة مناسبات `;
      
      if (venue.city) {
        response += `تقع في ${venue.city}. `;
      }
      
      if (venue.description) {
        response += `\n\nالوصف: ${venue.description} `;
      }
      
      if (venue.capacity && (venue.capacity.min || venue.capacity.max)) {
        response += `\n\nالسعة: تستوعب من ${venue.capacity.min || venue.min_capacity || '?'} إلى ${venue.capacity.max || venue.max_capacity || '?'} ضيف. `;
      } else if (venue.min_capacity || venue.max_capacity) {
        response += `\n\nالسعة: تستوعب من ${venue.min_capacity || '?'} إلى ${venue.max_capacity || '?'} ضيف. `;
      }
      
      if (venue.pricing || venue.starting_price) {
        const currency = venue.pricing?.currency || venue.currency || 'SAR';
        const startingPrice = venue.pricing?.startingPrice || venue.starting_price || 0;
        const pricePerPerson = venue.pricing?.pricePerPerson || venue.price_per_person;
        
        response += `\n\nالأسعار: تبدأ من ${startingPrice} ${currency}`;
        if (pricePerPerson) {
          response += `، مع سعر ${pricePerPerson} ${currency} للشخص الواحد`;
        }
        response += `. `;
      }
      
      if (venue.address) {
        response += `\n\nالعنوان: ${venue.address}، ${venue.city || ''}. `;
      }
      
      if (venue.categoryNames && venue.categoryNames.length > 0) {
        response += `\n\nالفئات: ${venue.categoryNames.join('، ')}. `;
      } else if (venue.category_name && Array.isArray(venue.category_name)) {
        response += `\n\nالفئات: ${venue.category_name.join('، ')}. `;
      }
      
      if (venue.amenities && venue.amenities.length > 0) {
        response += `\n\nالمرافق: ${venue.amenities.join('، ')}. `;
      }
      
      if (venue.wifi !== undefined) {
        response += `\n\nواي فاي: ${venue.wifi ? 'متوفر' : 'غير متوفر'}. `;
      }
      
      if (venue.parking !== undefined) {
        response += `\n\nموقف سيارات: ${venue.parking ? 'متوفر' : 'غير متوفر'}. `;
      }
      
      if (venue.accessibilityFeatures && venue.accessibilityFeatures.length > 0) {
        response += `\n\nميزات سهولة الوصول: ${venue.accessibilityFeatures.join('، ')}. `;
      } else if (venue.accessibility_features && Array.isArray(venue.accessibility_features)) {
        response += `\n\nميزات سهولة الوصول: ${venue.accessibility_features.join('، ')}. `;
      }
      
      if (venue.rating) {
        response += `\n\nالتقييم: ${venue.rating}/5 (${venue.reviews || venue.reviews_count || 0} تقييم). `;
      }
      
      if (venue.acceptedPaymentMethods && venue.acceptedPaymentMethods.length > 0) {
        response += `\n\nطرق الدفع المقبولة: ${venue.acceptedPaymentMethods.join('، ')}. `;
      } else if (venue.accepted_payment_methods && Array.isArray(venue.accepted_payment_methods)) {
        response += `\n\nطرق الدفع المقبولة: ${venue.accepted_payment_methods.join('، ')}. `;
      }
      
      if (venue.openingHours && Object.keys(venue.openingHours).length > 0) {
        response += `\n\nساعات العمل: `;
        const days = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
        const daysMap: {[key: string]: string} = {
          'monday': 'الإثنين',
          'tuesday': 'الثلاثاء',
          'wednesday': 'الأربعاء',
          'thursday': 'الخميس',
          'friday': 'الجمعة',
          'saturday': 'السبت',
          'sunday': 'الأحد'
        };
        
        Object.entries(venue.openingHours).forEach(([day, hours]) => {
          if (hours && hours.open && hours.close) {
            response += `\n${daysMap[day] || day}: ${hours.open} - ${hours.close}`;
          }
        });
      } else if (venue.opening_hours && typeof venue.opening_hours === 'object') {
        response += `\n\nساعات العمل: `;
        const daysMap: {[key: string]: string} = {
          'monday': 'الإثنين',
          'tuesday': 'الثلاثاء',
          'wednesday': 'الأربعاء',
          'thursday': 'الخميس',
          'friday': 'الجمعة',
          'saturday': 'السبت',
          'sunday': 'الأحد'
        };
        
        Object.entries(venue.opening_hours).forEach(([day, hours]) => {
          if (hours && typeof hours === 'object' && 'open' in hours && 'close' in hours) {
            const hourObj = hours as {open: string, close: string};
            response += `\n${daysMap[day] || day}: ${hourObj.open} - ${hourObj.close}`;
          }
        });
      }
      
      if (venue.additionalServices && venue.additionalServices.length > 0) {
        response += `\n\nخدمات إضافية: ${Array.isArray(venue.additionalServices) ? venue.additionalServices.join('، ') : venue.additionalServices}. `;
      } else if (venue.additional_services && venue.additional_services.length > 0) {
        response += `\n\nخدمات إضافية: ${Array.isArray(venue.additional_services) ? venue.additional_services.join('، ') : venue.additional_services}. `;
      }
      
      if (venue.rulesAndRegulations && Array.isArray(venue.rulesAndRegulations) && venue.rulesAndRegulations.length > 0) {
        response += `\n\nالقواعد واللوائح: `;
        venue.rulesAndRegulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            response += `\n${index + 1}. ${rule.title}: ${rule.description}`;
          }
        });
      } else if (venue.rules_and_regulations && Array.isArray(venue.rules_and_regulations) && venue.rules_and_regulations.length > 0) {
        response += `\n\nالقواعد واللوائح: `;
        venue.rules_and_regulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            response += `\n${index + 1}. ${rule.title}: ${rule.description}`;
          }
        });
      }
      
      return response;
    } else {
      let response = `${venue.name} is a venue `;
      
      if (venue.city) {
        response += `located in ${venue.city}. `;
      }
      
      if (venue.description) {
        response += `\n\nDescription: ${venue.description} `;
      }
      
      if (venue.capacity && (venue.capacity.min || venue.capacity.max)) {
        response += `\n\nCapacity: Accommodates from ${venue.capacity.min || venue.min_capacity || '?'} to ${venue.capacity.max || venue.max_capacity || '?'} guests. `;
      } else if (venue.min_capacity || venue.max_capacity) {
        response += `\n\nCapacity: Accommodates from ${venue.min_capacity || '?'} to ${venue.max_capacity || '?'} guests. `;
      }
      
      if (venue.pricing || venue.starting_price) {
        const currency = venue.pricing?.currency || venue.currency || 'SAR';
        const startingPrice = venue.pricing?.startingPrice || venue.starting_price || 0;
        const pricePerPerson = venue.pricing?.pricePerPerson || venue.price_per_person;
        
        response += `\n\nPricing: Starting at ${startingPrice} ${currency}`;
        if (pricePerPerson) {
          response += `, with a per-person rate of ${pricePerPerson} ${currency}`;
        }
        response += `. `;
      }
      
      if (venue.address) {
        response += `\n\nAddress: ${venue.address}, ${venue.city || ''}. `;
      }
      
      if (venue.categoryNames && venue.categoryNames.length > 0) {
        response += `\n\nCategories: ${venue.categoryNames.join(', ')}. `;
      } else if (venue.category_name && Array.isArray(venue.category_name)) {
        response += `\n\nCategories: ${venue.category_name.join(', ')}. `;
      }
      
      if (venue.amenities && venue.amenities.length > 0) {
        response += `\n\nAmenities: ${venue.amenities.join(', ')}. `;
      }
      
      if (venue.wifi !== undefined) {
        response += `\n\nWiFi: ${venue.wifi ? 'Available' : 'Not available'}. `;
      }
      
      if (venue.parking !== undefined) {
        response += `\n\nParking: ${venue.parking ? 'Available' : 'Not available'}. `;
      }
      
      if (venue.accessibilityFeatures && venue.accessibilityFeatures.length > 0) {
        response += `\n\nAccessibility features: ${venue.accessibilityFeatures.join(', ')}. `;
      } else if (venue.accessibility_features && Array.isArray(venue.accessibility_features)) {
        response += `\n\nAccessibility features: ${venue.accessibility_features.join(', ')}. `;
      }
      
      if (venue.rating) {
        response += `\n\nRating: ${venue.rating}/5 (${venue.reviews || venue.reviews_count || 0} reviews). `;
      }
      
      if (venue.acceptedPaymentMethods && venue.acceptedPaymentMethods.length > 0) {
        response += `\n\nAccepted payment methods: ${venue.acceptedPaymentMethods.join(', ')}. `;
      } else if (venue.accepted_payment_methods && Array.isArray(venue.accepted_payment_methods)) {
        response += `\n\nAccepted payment methods: ${venue.accepted_payment_methods.join(', ')}. `;
      }
      
      if (venue.openingHours && Object.keys(venue.openingHours).length > 0) {
        response += `\n\nOpening Hours: `;
        Object.entries(venue.openingHours).forEach(([day, hours]) => {
          if (hours && hours.open && hours.close) {
            response += `\n${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.open} - ${hours.close}`;
          }
        });
      } else if (venue.opening_hours && typeof venue.opening_hours === 'object') {
        response += `\n\nOpening Hours: `;
        Object.entries(venue.opening_hours).forEach(([day, hours]) => {
          if (hours && typeof hours === 'object' && 'open' in hours && 'close' in hours) {
            const hourObj = hours as {open: string, close: string};
            response += `\n${day.charAt(0).toUpperCase() + day.slice(1)}: ${hourObj.open} - ${hourObj.close}`;
          }
        });
      }
      
      if (venue.additionalServices && venue.additionalServices.length > 0) {
        response += `\n\nAdditional Services: ${Array.isArray(venue.additionalServices) ? venue.additionalServices.join(', ') : venue.additionalServices}. `;
      } else if (venue.additional_services && venue.additional_services.length > 0) {
        response += `\n\nAdditional Services: ${Array.isArray(venue.additional_services) ? venue.additional_services.join(', ') : venue.additional_services}. `;
      }
      
      if (venue.rulesAndRegulations && Array.isArray(venue.rulesAndRegulations) && venue.rulesAndRegulations.length > 0) {
        response += `\n\nRules and Regulations: `;
        venue.rulesAndRegulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            response += `\n${index + 1}. ${rule.title}: ${rule.description}`;
          }
        });
      } else if (venue.rules_and_regulations && Array.isArray(venue.rules_and_regulations) && venue.rules_and_regulations.length > 0) {
        response += `\n\nRules and Regulations: `;
        venue.rules_and_regulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            response += `\n${index + 1}. ${rule.title}: ${rule.description}`;
          }
        });
      }
      
      return response;
    }
  };

  const getResponseForVenueQuery = (query: string): string => {
    query = query.toLowerCase();
    
    // Simple greeting - just respond with a friendly greeting without excessive information
    if (/^(hi|hello|hey|مرحبا|اهلا|السلام عليكم)$/i.test(query.trim())) {
      const isArabic = isArabicText(query);
      
      if (isArabic) {
        return `مرحباً! كيف يمكنني مساعدتك بخصوص ${venue.name}؟`;
      } else {
        return `Hello! How can I help you with information about ${venue.name}?`;
      }
    }
    
    if (/more details|tell me more|explain|elaborate|details|all info|full details|everything|more information|كل التفاصيل|شرح|تفاصيل/i.test(query)) {
      return generateDetailedResponse(venue);
    }

    if ((/about|describe|what is|tell me about|overview|وصف/i.test(query)) && venue.description) {
      return venue.description;
    }
    
    if (/max(imum)? capacity|max guests|most people|how many people|max attendees/i.test(query)) {
      return `${venue.name} can accommodate up to ${venue.capacity?.max || venue.max_capacity || '?'} guests.`;
    }

    if (/price|cost|fee|how much|rate|pricing/i.test(query)) {
      const currency = venue.pricing?.currency || venue.currency || 'SAR';
      const startingPrice = venue.pricing?.startingPrice || venue.starting_price || 0;
      const pricePerPerson = venue.pricing?.pricePerPerson || venue.price_per_person;
      
      let priceResponse = `The starting price for ${venue.name} is ${startingPrice.toLocaleString()} ${currency}.`;
      if (pricePerPerson) {
        priceResponse += ` There is also a per-person rate of ${pricePerPerson.toLocaleString()} ${currency} per guest.`;
      }
      return priceResponse;
    }

    if (/location|address|where|place|situated|city|area/i.test(query)) {
      return `${venue.name} is located at ${venue.address || '(address not specified)'}, ${venue.city || ''}.`;
    }

    if (/amenities|facilities|features|offer|provide|service/i.test(query)) {
      if (!venue.amenities || venue.amenities.length === 0) {
        return `${venue.name} does not have any listed amenities.`;
      }
      return `${venue.name} offers the following amenities: ${venue.amenities.join(', ')}.`;
    }

    if (/wifi|internet|connection/i.test(query)) {
      return venue.wifi 
        ? `Yes, ${venue.name} provides WiFi connectivity.` 
        : `No, ${venue.name} does not offer WiFi.`;
    }

    if (/parking|car|vehicle/i.test(query)) {
      return venue.parking 
        ? `Yes, ${venue.name} has parking facilities available.` 
        : `No, ${venue.name} does not have dedicated parking.`;
    }

    if (/accessibility|accessible|wheelchair|disabled/i.test(query)) {
      if (!venue.accessibilityFeatures || venue.accessibilityFeatures.length === 0) {
        if (venue.accessibility_features && Array.isArray(venue.accessibility_features) && venue.accessibility_features.length > 0) {
          return `${venue.name} offers these accessibility features: ${venue.accessibility_features.join(', ')}.`;
        }
        return `I don't have specific information about accessibility features for ${venue.name}.`;
      }
      return `${venue.name} offers these accessibility features: ${venue.accessibilityFeatures.join(', ')}.`;
    }

    if (/payment|pay|credit card|cash/i.test(query)) {
      if (!venue.acceptedPaymentMethods || venue.acceptedPaymentMethods.length === 0) {
        if (venue.accepted_payment_methods && Array.isArray(venue.accepted_payment_methods) && venue.accepted_payment_methods.length > 0) {
          return `${venue.name} accepts the following payment methods: ${venue.accepted_payment_methods.join(', ')}.`;
        }
        return `I don't have specific information about accepted payment methods for ${venue.name}.`;
      }
      return `${venue.name} accepts the following payment methods: ${venue.acceptedPaymentMethods.join(', ')}.`;
    }

    if (/category|type|kind|event type/i.test(query)) {
      if (venue.categoryNames && Array.isArray(venue.categoryNames)) {
        return `${venue.name} is categorized as: ${venue.categoryNames.join(', ')}.`;
      } else if (venue.category_name && Array.isArray(venue.category_name)) {
        return `${venue.name} is categorized as: ${venue.category_name.join(', ')}.`;
      } else if (venue.type) {
        return `${venue.name} is categorized as: ${venue.type}.`;
      } else {
        return `${venue.name} is categorized as: ${venue.category || 'No category information available'}.`;
      }
    }

    if (/rating|review|score|stars/i.test(query)) {
      return venue.rating
        ? `${venue.name} has a rating of ${venue.rating} out of 5 based on ${venue.reviews || venue.reviews_count || 0} reviews.`
        : `${venue.name} does not have any ratings yet.`;
    }

    if (/hours|time|open|close|opening|closing/i.test(query)) {
      let hoursInfo;
      
      if (venue.openingHours && Object.keys(venue.openingHours).length > 0) {
        hoursInfo = venue.openingHours;
      } else if (venue.opening_hours && typeof venue.opening_hours === 'object') {
        hoursInfo = venue.opening_hours;
      }
      
      if (!hoursInfo) {
        return `I don't have specific information about operating hours for ${venue.name}.`;
      }
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      let hoursText = `${venue.name} is open on:\n`;
      
      days.forEach(day => {
        const hours = hoursInfo[day];
        if (hours && typeof hours === 'object' && 'open' in hours && 'close' in hours) {
          const hourObj = hours as {open: string, close: string};
          hoursText += `${day.charAt(0).toUpperCase() + day.slice(1)}: ${hourObj.open} - ${hourObj.close}\n`;
        } else {
          hoursText += `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
        }
      });
      
      return hoursText;
    }

    if (/rules|policies|regulations|terms/i.test(query)) {
      if (venue.rulesAndRegulations && Array.isArray(venue.rulesAndRegulations) && venue.rulesAndRegulations.length > 0) {
        let rulesText = `${venue.name} has the following rules and regulations:\n\n`;
        
        venue.rulesAndRegulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            rulesText += `${index + 1}. ${rule.title}: ${rule.description}\n`;
          }
        });
        
        return rulesText;
      } else if (venue.rules_and_regulations && Array.isArray(venue.rules_and_regulations) && venue.rules_and_regulations.length > 0) {
        let rulesText = `${venue.name} has the following rules and regulations:\n\n`;
        
        venue.rules_and_regulations.forEach((rule, index) => {
          if (typeof rule === 'object' && rule.title && rule.description) {
            rulesText += `${index + 1}. ${rule.title}: ${rule.description}\n`;
          }
        });
        
        return rulesText;
      }
      
      return `I don't have specific information about rules and regulations for ${venue.name}.`;
    }

    if (/additional services|extra services|special services/i.test(query)) {
      if (venue.additionalServices && venue.additionalServices.length > 0) {
        const services = Array.isArray(venue.additionalServices) 
          ? venue.additionalServices.join(', ')
          : venue.additionalServices;
        
        return `${venue.name} offers these additional services: ${services}.`;
      } else if (venue.additional_services && venue.additional_services.length > 0) {
        const services = Array.isArray(venue.additional_services) 
          ? venue.additional_services.join(', ')
          : venue.additional_services;
        
        return `${venue.name} offers these additional services: ${services}.`;
      }
      
      return `I don't have information about additional services for ${venue.name}.`;
    }

    const isArabic = isArabicText(query);
    
    if (isArabic) {
      return `${venue.name} هي ${venue.type || venue.category || 'قاعة'} تقع في ${venue.city || ''}. تستوعب من ${venue.capacity?.min || venue.min_capacity || '?'} إلى ${venue.capacity?.max || venue.max_capacity || '?'} ضيف بأسعار تبدأ من ${venue.pricing?.startingPrice || venue.starting_price || 0} ${venue.pricing?.currency || venue.currency || 'SAR'}. ${venue.description ? 'الوصف: ' + venue.description : ''}`;
    } else {
      return `${venue.name} is a ${venue.type || venue.category || 'venue'} located in ${venue.city || ''}. It can accommodate ${venue.capacity?.min || venue.min_capacity || '?'}-${venue.capacity?.max || venue.max_capacity || '?'} guests with pricing starting at ${venue.pricing?.startingPrice || venue.starting_price || 0} ${venue.pricing?.currency || venue.currency || 'SAR'}. ${venue.description ? 'Description: ' + venue.description : ''}`;
    }
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

    const isVoiceInput = !!options?.viaMic;
    
    if (isVoiceInput) {
      setAudioEnabled(true);
    }

    try {
      const botResponse = getResponseForVenueQuery(messageText);
      
      const botMessage = {
        id: generateId(),
        sender: 'bot' as const,
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);
      setLastBotShouldSpeak(isVoiceInput || isSpeakerOn);
      
      setChatbotState('idle');
    } catch (error: any) {
      console.error('Error generating response:', error);
      
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
        title: "Error",
        description: error.message || "Could not generate a response. Please try again later."
      });
      
      setTimeout(() => setChatbotState('idle'), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
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
    speak(text, 
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

  const clearChatHistory = () => {
    setMessages([{
      id: '0',
      sender: 'bot',
      content: `Hello! I'm your assistant for ${venue.name}. Ask me anything about this venue!`,
      timestamp: new Date()
    }]);
    
    localStorage.removeItem(chatStorageKey);
    
    toast({
      title: "Chat History Cleared",
      description: "Your conversation history has been cleared."
    });
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
            <p>Chat with {venue.name} Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[560px] h-[600px] p-0 overflow-hidden right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl flex flex-col"
          aria-describedby="chatbot-description"
        >
          <DialogTitle className="sr-only">{venue.name} Assistant</DialogTitle>
          <DialogDescription id="chatbot-description" className="sr-only">
            Chat with our venue assistant to learn more about {venue.name}
          </DialogDescription>

          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>

          <div className="w-full flex flex-col items-center p-6 border-b border-white/10 bg-findvenue/90 gap-1">
            <div className="flex flex-col items-center">
              <div className="rounded-full border-4 border-blue-300 bg-white/50 shadow-lg p-1 mb-2">
                <img
                  src={"/favicon.ico"}
                  alt="Venue Assistant"
                  className="w-16 h-16 rounded-full"
                />
              </div>
              <span className="text-xl font-bold text-blue-100 tracking-wide mb-0.5">
                {venue.name} Assistant
              </span>
              <span className="text-xs text-blue-100/80">
                Smart Q&A for all details about this venue.
              </span>
            </div>
            <span className="mt-3 text-[13px] text-blue-200 italic whitespace-pre-line text-center max-w-xs">
              {"Ask about capacity, prices, amenities...\nيمكنك السؤال عن القاعة بالعربية أيضاً!"}
            </span>
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
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 items-center">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about this venue..."
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
            <div className="flex justify-between mt-2">
              <p className="text-xs text-findvenue-text-muted">
                Ask about capacity, pricing, amenities, or any other venue details!
                {speechRecognitionSupported === false && (
                  <span className="text-yellow-500 ml-2">Voice features not supported in your browser.</span>
                )}
              </p>
              <div className="flex gap-2 items-center">
                <Button
                  size="icon"
                  variant={isSpeakerOn ? "default" : "outline"}
                  className={`h-7 w-7 ${isSpeakerOn ? "bg-blue-700" : ""}`}
                  title={isSpeakerOn ? "Speaker on" : "Speaker off"}
                  aria-pressed={isSpeakerOn}
                  onClick={() => setIsSpeakerOn(on => !on)}
                  tabIndex={0}
                >
                  <Volume2 className={`h-4 w-4 ${isSpeakerOn ? "text-findvenue" : "text-gray-400"}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearChatHistory} 
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear Chat
                </Button>
              </div>
            </div>
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

export default VenueDetailsChatbot;
