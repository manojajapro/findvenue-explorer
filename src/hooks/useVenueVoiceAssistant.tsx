
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface VoiceAssistantHookProps {
  onSubmit: (message: string) => void;
}

export const useVenueVoiceAssistant = ({ onSubmit }: VoiceAssistantHookProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Check for browser support
  useEffect(() => {
    const isRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setIsSupported(isRecognitionSupported);
    
    if (!isRecognitionSupported) {
      console.warn('Speech recognition is not supported in this browser.');
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
    }
    
    return () => {
      if (recognitionRef.current) {
        stopListening();
      }
    };
  }, [isSupported]);

  // Handle speech recognition results
  useEffect(() => {
    if (!isSupported || !recognitionRef.current) return;
    
    const handleResult = (event: SpeechRecognitionEvent) => {
      const result = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setTranscript(result);
    };
    
    const handleEnd = () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
    };
    
    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        toast({
          title: 'Microphone access denied',
          description: 'Please allow microphone access to use the voice assistant.',
          variant: 'destructive',
        });
        setIsListening(false);
      }
    };
    
    // Add event listeners
    if (recognitionRef.current) {
      recognitionRef.current.onresult = handleResult;
      recognitionRef.current.onend = handleEnd;
      recognitionRef.current.onerror = handleError;
    }
    
    return () => {
      if (recognitionRef.current) {
        // Remove event listeners
        // TypeScript doesn't like null assignments for these event handlers,
        // so we use empty functions instead
        recognitionRef.current.onresult = () => {};
        recognitionRef.current.onend = () => {};
        recognitionRef.current.onerror = () => {};
      }
    };
  }, [isListening, isSupported, toast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({
        title: 'Not supported',
        description: 'Speech recognition is not supported in your browser.',
        variant: 'destructive',
      });
      return;
    }
    
    setTranscript('');
    setIsListening(true);
    
    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [isSupported, toast]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    
    try {
      recognitionRef.current?.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
    
    // Submit the transcript if it's not empty
    if (transcript.trim()) {
      onSubmit(transcript);
    }
  }, [transcript, onSubmit]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
};

// Add missing types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
