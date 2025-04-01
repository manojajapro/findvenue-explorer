import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

type VenueVoiceAssistantProps = {
  venue?: any;
  autoRestart?: boolean;
  onListeningChange?: (isListening: boolean) => void;
  onTranscript?: (text: string) => void;
  onAnswer?: (text: string) => void;
};

export const useVenueVoiceAssistant = ({
  venue,
  autoRestart = false,
  onListeningChange,
  onTranscript,
  onAnswer
}: VenueVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const recognition = useRef<SpeechRecognition | null>(null);
  
  const handleSpeechStart = useCallback(() => {
    setIsListening(true);
    setTranscript('');
    setError(null);
    
    if (onListeningChange) {
      onListeningChange(true);
    }
  }, [onListeningChange]);
  
  const handleSpeechEnd = useCallback(() => {
    setIsListening(false);
    
    if (onListeningChange) {
      onListeningChange(false);
    }
    
    if (transcript.trim() && !isProcessing) {
      processVoiceQuery(transcript);
    }
  }, [transcript, isProcessing, onListeningChange]);
  
  const processVoiceQuery = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log(`Processing voice query: "${query}"`);
      
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query,
          venueId: venue?.id,
          type: 'voice'
        }
      });
      
      if (error) {
        console.error('Error calling venue-assistant:', error);
        throw new Error(error.message);
      }
      
      if (data && data.answer) {
        console.log('AI response:', data.answer);
        setAnswer(data.answer);
        
        if (onAnswer) {
          onAnswer(data.answer);
        }
        
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.answer);
          utterance.lang = 'en-US';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        throw new Error('No answer received from AI assistant');
      }
    } catch (err: any) {
      console.error('Error processing voice query:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error processing your request',
        description: err.message || 'Please try again later'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [venue?.id, toast, onAnswer]);
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';
    } else {
      setError('Speech recognition is not supported in your browser.');
    }
    
    return () => {
      if (recognition.current) {
        try {
          if (isListening) {
            recognition.current.stop();
          }
        } catch (e) {
          console.error('Error stopping speech recognition:', e);
        }
      }
    };
  }, [isListening]);
  
  useEffect(() => {
    if (autoRestart && !isListening && !isProcessing) {
      const timer = setTimeout(() => {
        console.log('Auto-restarting voice recognition...');
        startListening();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoRestart, isListening, isProcessing]);
  
  const startListening = useCallback(() => {
    if (!recognition.current) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }
    
    try {
      recognition.current.onstart = () => {
        handleSpeechStart();
      };
      
      recognition.current.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0][0].transcript;
        console.log('Speech recognized:', text);
        setTranscript(text);
        
        if (onTranscript) {
          onTranscript(text);
        }
      };
      
      recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        
        if (onListeningChange) {
          onListeningChange(false);
        }
      };
      
      recognition.current.onend = () => {
        handleSpeechEnd();
      };
      
      recognition.current.start();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setError(err.message);
      setIsListening(false);
      
      if (onListeningChange) {
        onListeningChange(false);
      }
    }
  }, [handleSpeechStart, handleSpeechEnd, onTranscript, onListeningChange]);
  
  const stopListening = useCallback(() => {
    if (recognition.current) {
      try {
        recognition.current.stop();
      } catch (e) {
        console.error('Error stopping speech recognition:', e);
      }
    }
    
    setIsListening(false);
    
    if (onListeningChange) {
      onListeningChange(false);
    }
  }, [onListeningChange]);
  
  return {
    isListening,
    transcript,
    answer,
    error,
    isProcessing,
    startListening,
    stopListening,
    setTranscript
  };
};

export default useVenueVoiceAssistant;
