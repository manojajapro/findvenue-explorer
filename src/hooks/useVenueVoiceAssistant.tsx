
import { useState, useEffect, useCallback, useRef } from 'react';
import { useVenueData } from '@/hooks/useVenueData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// Define a type for the SpeechRecognition interface
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Define a window interface with the webkit prefix properly
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

export const useVenueVoiceAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { venue, isLoading: isLoadingVenue } = useVenueData();
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    // Use proper typing for window object with speech recognition
    const windowWithSpeech = window as unknown as WindowWithSpeechRecognition;
    const SpeechRecognitionAPI = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      const recognition = recognitionRef.current;
      
      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.addEventListener('result', (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
            
          setTranscript(transcript);
        });
        
        recognition.addEventListener('end', () => {
          if (isListening) {
            recognition.start();
          }
        });
      }
    } else {
      console.error('Speech recognition not supported');
      toast.error('Speech recognition is not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isListening]);
  
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      // Process the final transcript if available
      if (transcript.trim()) {
        processVoiceInput(transcript);
      }
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
    
    setIsListening(!isListening);
  }, [isListening, transcript]);
  
  const processVoiceInput = useCallback(async (input: string) => {
    if (!input.trim() || isProcessing || !venue) return;
    
    // Add user message to chat
    const newUserMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, newUserMessage]);
    
    setTranscript('');
    setIsProcessing(true);
    
    try {
      // Call the Supabase edge function with the venue context
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: input,
          venueId: venue.id,
          type: 'voice'
        }
      });
      
      if (error) throw error;
      
      const assistantResponse = { 
        role: 'assistant' as const, 
        content: data.answer || "I'm sorry, I couldn't process your request at this time." 
      };
      
      setMessages(prev => [...prev, assistantResponse]);
      
      // Read the response aloud if supported
      if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(assistantResponse.content);
        speech.lang = 'en-US';
        window.speechSynthesis.speak(speech);
      }
    } catch (error) {
      console.error('Error in voice assistant:', error);
      
      toast.error('Failed to get a response', {
        description: 'Please try again in a moment',
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [venue, isProcessing]);
  
  const submitVoiceInput = useCallback((manualInput: string) => {
    if (manualInput.trim()) {
      processVoiceInput(manualInput);
    }
  }, [processVoiceInput]);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
    setTranscript('');
    
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);
  
  return {
    messages,
    isListening,
    transcript,
    isProcessing,
    isLoading: isProcessing || isLoadingVenue,
    toggleListening,
    submitVoiceInput,
    clearMessages,
    venue
  };
};
