
import { useState, useCallback, useEffect, useRef } from 'react';
import { useVenueData } from '@/hooks/useVenueData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SpeechRecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

export const useVenueVoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { venue, isLoading: isLoadingVenue } = useVenueData();
  const [autoRestart, setAutoRestart] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Speech recognition API
  const recognition = useRef<any>(null);
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        recognition.current = recognitionInstance;
      }
      
      if ('speechSynthesis' in window) {
        speechSynthesis.current = window.speechSynthesis;
      }
    }
  }, []);

  // Function to handle when speech synthesis ends
  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    
    // If autoRestart is enabled, restart listening when speech ends
    if (autoRestart && !isListening) {
      setTimeout(() => {
        startListening();
      }, 500); // Small delay before starting listening again
    }
  }, [autoRestart, isListening]);

  const startListening = useCallback(() => {
    if (!recognition.current) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    // Don't start listening if already speaking
    if (isSpeaking) {
      return;
    }

    setIsListening(true);
    setTranscript('');
    setError(null);

    recognition.current.onstart = () => {
      console.log('Voice recognition started');
    };

    recognition.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      processVoiceQuery(transcript);
    };

    recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
      
      // If autoRestart is enabled, restart listening on non-fatal errors
      if (autoRestart && event.error !== 'aborted' && event.error !== 'not-allowed') {
        setTimeout(() => {
          startListening();
        }, 1000);
      }
    };

    recognition.current.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      
      // Only auto-restart if not currently speaking and autoRestart is enabled
      if (autoRestart && !isSpeaking && !isProcessing) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    try {
      recognition.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition');
      setIsListening(false);
    }
  }, [autoRestart, isSpeaking, isProcessing, processVoiceQuery]);

  const stopListening = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
    
    // Turn off auto-restart
    setAutoRestart(false);
  }, []);

  const toggleAutoRestart = useCallback(() => {
    setAutoRestart(prev => !prev);
    
    // If turning on auto-restart and not currently listening, start listening
    if (!autoRestart && !isListening && !isSpeaking) {
      setTimeout(() => {
        startListening();
      }, 300);
    }
    
    toast.info(autoRestart ? 'Continuous listening disabled' : 'Continuous listening enabled');
  }, [autoRestart, isListening, isSpeaking, startListening]);

  const processVoiceQuery = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Call the Supabase edge function with the venue context
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query,
          venueId: venue?.id,
          type: 'voice'
        }
      });
      
      if (error) throw error;
      
      const assistantResponse = data.answer || "I'm sorry, I couldn't process your request at this time.";
      setResponse(assistantResponse);
      
      // Use speech synthesis to speak the response
      if (speechSynthesis.current) {
        // Cancel any ongoing speech
        speechSynthesis.current.cancel();
        
        const speech = new SpeechSynthesisUtterance(assistantResponse);
        speech.rate = 1;
        speech.pitch = 1;
        speech.volume = 1;
        
        // Get available voices
        const voices = speechSynthesis.current.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.lang === 'en-US' && (voice.name.includes('Female') || voice.name.includes('Samantha'))
        );
        
        if (preferredVoice) {
          speech.voice = preferredVoice;
        }
        
        // Set event handlers
        speech.onstart = () => setIsSpeaking(true);
        speech.onend = handleSpeechEnd;
        speech.onerror = () => {
          setIsSpeaking(false);
          if (autoRestart) startListening();
        };
        
        setIsSpeaking(true);
        speechSynthesis.current.speak(speech);
      }
      
    } catch (error: any) {
      console.error('Error processing voice query:', error);
      setError('Failed to process your query');
      setResponse("I'm sorry, I encountered an error processing your request. Please try again.");
      
      // Speak the error message
      if (speechSynthesis.current) {
        const speech = new SpeechSynthesisUtterance("I'm sorry, I encountered an error processing your request. Please try again.");
        speech.onend = handleSpeechEnd;
        speechSynthesis.current.speak(speech);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [venue, handleSpeechEnd, autoRestart, startListening]);

  return {
    isListening,
    transcript,
    response,
    isProcessing,
    error,
    startListening,
    stopListening,
    toggleAutoRestart,
    autoRestart,
    isSpeaking,
    venue,
    isLoadingVenue
  };
};
