
import { useState, useCallback } from 'react';
import { useVenueData } from '@/hooks/useVenueData';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export const useChatWithVenue = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { venue, isLoading: isLoadingVenue } = useVenueData();

  const generateVenuePrompt = useCallback(() => {
    if (!venue) return '';
    
    return `
      You are an AI assistant for a venue booking platform. You have the following information about a specific venue:
      
      Venue Name: ${venue.name}
      Description: ${venue.description}
      Category: ${venue.category}
      City: ${venue.city}
      Address: ${venue.address}
      Capacity: Minimum ${venue.capacity.min} and Maximum ${venue.capacity.max} guests
      Starting Price: ${venue.pricing.currency} ${venue.pricing.startingPrice}
      ${venue.pricing.pricePerPerson ? `Price Per Person: ${venue.pricing.currency} ${venue.pricing.pricePerPerson}` : ''}
      Amenities: ${venue.amenities.join(', ')}
      ${venue.parking ? 'Parking: Available' : 'Parking: Not available'}
      ${venue.wifi ? 'WiFi: Available' : 'WiFi: Not available'}
      ${venue.additionalServices?.length > 0 ? `Additional Services: ${venue.additionalServices.join(', ')}` : ''}
      
      When answering questions, provide specific details about this venue. If you don't know something, say you don't have that information.
    `;
  }, [venue]);

  const submitMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;
    
    // Add user message to chat
    const newUserMessage = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call an API
      // For now, we'll simulate a response based on venue data
      const venuePrompt = generateVenuePrompt();
      
      setTimeout(() => {
        let response = "I don't have specific information about this venue yet.";
        
        if (venue) {
          // Simple keyword matching for demonstration
          if (userMessage.toLowerCase().includes('price') || userMessage.toLowerCase().includes('cost')) {
            response = `The starting price for ${venue.name} is ${venue.pricing.currency} ${venue.pricing.startingPrice}${venue.pricing.pricePerPerson ? ` with a per-person rate of ${venue.pricing.currency} ${venue.pricing.pricePerPerson}` : ''}.`;
          } else if (userMessage.toLowerCase().includes('capacity') || userMessage.toLowerCase().includes('people') || userMessage.toLowerCase().includes('guests')) {
            response = `${venue.name} can accommodate between ${venue.capacity.min} and ${venue.capacity.max} guests.`;
          } else if (userMessage.toLowerCase().includes('amenities') || userMessage.toLowerCase().includes('facilities')) {
            response = `${venue.name} offers the following amenities: ${venue.amenities.join(', ')}.`;
          } else if (userMessage.toLowerCase().includes('location') || userMessage.toLowerCase().includes('address')) {
            response = `${venue.name} is located at ${venue.address} in ${venue.city}.`;
          } else if (userMessage.toLowerCase().includes('parking')) {
            response = venue.parking ? `Yes, ${venue.name} has parking available.` : `No, ${venue.name} does not have dedicated parking.`;
          } else if (userMessage.toLowerCase().includes('wifi') || userMessage.toLowerCase().includes('internet')) {
            response = venue.wifi ? `Yes, ${venue.name} provides WiFi for guests.` : `No, ${venue.name} does not have WiFi available.`;
          } else if (userMessage.toLowerCase().includes('describe') || userMessage.toLowerCase().includes('tell me about')) {
            response = `${venue.name} is a ${venue.category} venue located in ${venue.city}. ${venue.description}`;
          } else {
            response = `${venue.name} is a ${venue.category} venue in ${venue.city} that can accommodate between ${venue.capacity.min} and ${venue.capacity.max} guests. Would you like to know specific details about pricing, amenities, or location?`;
          }
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
      setIsLoading(false);
    }
  }, [venue, isLoading, generateVenuePrompt]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading: isLoading || isLoadingVenue,
    submitMessage,
    clearMessages,
    venue
  };
};
