
import { useState, useCallback, useEffect } from 'react';
import { useVenueData } from '@/hooks/useVenueData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export const useChatWithVenue = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { venue, isLoading: isLoadingVenue } = useVenueData();
  
  useEffect(() => {
    if (venue && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your assistant for ${venue.name}. You can ask me about pricing, capacity, amenities, booking information, or anything else you'd like to know about this venue!`
      }]);
    }
  }, [venue, messages.length]);

  const submitMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;
    
    const newUserMessage = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    
    setIsLoading(true);
    
    try {
      if (!venue?.id) {
        throw new Error('No venue ID available');
      }
      
      console.log('Calling venue-assistant function with:', {
        query: userMessage,
        venueId: venue.id
      });
      
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: userMessage,
          venueId: venue.id,
          type: 'chat'
        }
      });
      
      if (error) {
        console.error('Error from function:', error);
        throw error;
      }
      
      const assistantResponse = { 
        role: 'assistant' as const, 
        content: data?.answer || "I'm sorry, I couldn't process your request at this time." 
      };
      
      console.log('Received response:', assistantResponse.content);
      setMessages(prev => [...prev, assistantResponse]);
    } catch (error) {
      console.error('Error in chat:', error);
      
      toast.error('Failed to get a response', {
        description: 'Please try again in a moment',
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [venue, isLoading]);

  const clearMessages = useCallback(() => {
    if (venue) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your assistant for ${venue.name}. You can ask me about pricing, capacity, amenities, booking information, or anything else you'd like to know about this venue!`
      }]);
    } else {
      setMessages([]);
    }
  }, [venue]);

  return {
    messages,
    isLoading: isLoading || isLoadingVenue,
    submitMessage,
    clearMessages,
    venue
  };
};
