
import { useState, useCallback } from 'react';
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

  const submitMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;
    
    // Add user message to chat
    const newUserMessage = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    
    setIsLoading(true);
    
    try {
      // Call the Supabase edge function with the venue context
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: userMessage,
          venueId: venue?.id,
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
