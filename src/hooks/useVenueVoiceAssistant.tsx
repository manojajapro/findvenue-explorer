
import { useState, useCallback, useEffect } from 'react';
import { useVenueData } from '@/hooks/useVenueData';

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
  
  // Speech recognition API
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize speech recognition on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognition) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    setIsListening(true);
    setTranscript('');
    setError(null);

    recognition.onstart = () => {
      console.log('Voice recognition started');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      processVoiceQuery(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition');
      setIsListening(false);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  const processVoiceQuery = useCallback(async (query: string) => {
    if (!query.trim() || !venue) {
      return;
    }

    setIsProcessing(true);

    try {
      // Simple keyword matching similar to chat
      setTimeout(() => {
        let assistantResponse = "I don't have specific information about this venue yet.";
        
        if (venue) {
          // Simple keyword matching for demonstration
          if (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost')) {
            assistantResponse = `The starting price for ${venue.name} is ${venue.pricing.currency} ${venue.pricing.startingPrice}${venue.pricing.pricePerPerson ? ` with a per-person rate of ${venue.pricing.currency} ${venue.pricing.pricePerPerson}` : ''}.`;
          } else if (query.toLowerCase().includes('capacity') || query.toLowerCase().includes('people') || query.toLowerCase().includes('guests')) {
            assistantResponse = `${venue.name} can accommodate between ${venue.capacity.min} and ${venue.capacity.max} guests.`;
          } else if (query.toLowerCase().includes('amenities') || query.toLowerCase().includes('facilities')) {
            assistantResponse = `${venue.name} offers the following amenities: ${venue.amenities.join(', ')}.`;
          } else if (query.toLowerCase().includes('location') || query.toLowerCase().includes('address')) {
            assistantResponse = `${venue.name} is located at ${venue.address} in ${venue.city}.`;
          } else if (query.toLowerCase().includes('parking')) {
            assistantResponse = venue.parking ? `Yes, ${venue.name} has parking available.` : `No, ${venue.name} does not have dedicated parking.`;
          } else if (query.toLowerCase().includes('wifi') || query.toLowerCase().includes('internet')) {
            assistantResponse = venue.wifi ? `Yes, ${venue.name} provides WiFi for guests.` : `No, ${venue.name} does not have WiFi available.`;
          } else if (query.toLowerCase().includes('describe') || query.toLowerCase().includes('tell me about')) {
            assistantResponse = `${venue.name} is a ${venue.category} venue located in ${venue.city}. ${venue.description}`;
          } else {
            assistantResponse = `${venue.name} is a ${venue.category} venue in ${venue.city} that can accommodate between ${venue.capacity.min} and ${venue.capacity.max} guests. You can ask about pricing, amenities, or location.`;
          }
        }
        
        setResponse(assistantResponse);
        
        // Use speech synthesis to speak the response
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const speech = new SpeechSynthesisUtterance(assistantResponse);
          speech.rate = 1;
          speech.pitch = 1;
          speech.volume = 1;
          window.speechSynthesis.speak(speech);
        }
        
        setIsProcessing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error processing voice query:', error);
      setError('Failed to process your query');
      setIsProcessing(false);
    }
  }, [venue]);

  return {
    isListening,
    transcript,
    response,
    isProcessing,
    error,
    startListening,
    stopListening,
    venue,
    isLoadingVenue
  };
};
