
import { useState, useEffect, useCallback } from 'react';
import { Venue } from './useSupabaseVenues';

// Define interface for the SpeechRecognition Web API
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

// Message type for voice assistant chat
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const useVenueVoiceAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognition = 
      windowWithSpeech.SpeechRecognition || 
      windowWithSpeech.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      recognitionInstance.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(currentTranscript);
      };
      
      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition is not supported in this browser.');
    }
    
    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, []);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      if (transcript) {
        submitVoiceInput(transcript);
        setTranscript('');
      }
    } else {
      recognition.start();
      setTranscript('');
    }
    
    setIsListening(prev => !prev);
  }, [isListening, recognition, transcript]);

  // Submit voice input for processing
  const submitVoiceInput = useCallback((input: string) => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsProcessing(true);
    
    // For now, just echo back the input as a simple example
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I received your message: "${input}". This is a placeholder response.` 
      }]);
      setIsProcessing(false);
    }, 1000);
    
    // In a real implementation, you would process the input with an AI service
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isListening,
    transcript,
    isProcessing,
    isLoading,
    toggleListening,
    submitVoiceInput,
    clearMessages
  };
};

export default useVenueVoiceAssistant;
