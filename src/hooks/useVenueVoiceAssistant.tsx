
import { useState, useEffect, useRef, useCallback } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { supabase } from '@/integrations/supabase/client';

interface UseVenueVoiceAssistantProps {
  venue: Venue | null;
  autoRestart?: boolean;
  onTranscript?: (text: string) => void;
  onAnswer?: (text: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export const useVenueVoiceAssistant = ({
  venue,
  autoRestart = true,
  onTranscript,
  onAnswer,
  onSpeechStart,
  onSpeechEnd
}: UseVenueVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isWelcomePlayed, setIsWelcomePlayed] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const welcomeTextRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);
  
  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setTranscript(transcript);
        
        if (onTranscript) {
          onTranscript(transcript);
        }
        
        // Final result handling
        if (event.results[0].isFinal) {
          handleFinalTranscript(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        
        // Only auto-restart if not currently processing a query
        if (autoRestart && !processingRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && !processingRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error('Failed to restart recognition:', e);
              }
            }
          }, 1000);
        }
      };
    } else {
      setError('Speech recognition not supported in this browser.');
    }
  }, [autoRestart, onTranscript]);
  
  // Handle final transcript and send to AI
  const handleFinalTranscript = useCallback(async (text: string) => {
    if (!text.trim() || !venue || processingRef.current) return;
    
    try {
      setIsProcessing(true);
      processingRef.current = true;
      
      // Stop listening while processing
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: text,
          venueId: venue.id,
          type: 'voice'
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (data?.answer) {
        if (onAnswer) {
          onAnswer(data.answer);
        }
        
        if (audioEnabled) {
          speakText(data.answer);
        }
      }
    } catch (err: any) {
      console.error('Error processing voice query:', err);
      setError(err.message || 'Failed to process your request');
      
      if (onAnswer) {
        onAnswer("I'm sorry, I encountered an error processing your request. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      setTranscript('');
      
      // Only restart if autoRestart is enabled and we're not in an error state
      if (autoRestart && !error) {
        setTimeout(() => {
          startListening();
        }, 1000);
      }
    }
  }, [venue, audioEnabled, onAnswer, autoRestart]);
  
  // Speak text using speech synthesis
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      setError('Speech synthesis not supported in this browser.');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesisRef.current = utterance;
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a good English voice
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && 
      (voice.name.includes('Female') || voice.name.includes('Google') || voice.name.includes('Samantha'))
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Add event handlers
    utterance.onstart = () => {
      if (onSpeechStart) {
        onSpeechStart();
      }
    };
    
    utterance.onend = () => {
      if (onSpeechEnd) {
        onSpeechEnd();
      }
      speechSynthesisRef.current = null;
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      if (onSpeechEnd) {
        onSpeechEnd();
      }
      speechSynthesisRef.current = null;
    };
    
    window.speechSynthesis.speak(utterance);
  }, [onSpeechStart, onSpeechEnd]);
  
  // Play welcome message when venue is loaded
  useEffect(() => {
    if (venue && !isWelcomePlayed && audioEnabled && !welcomeTextRef.current) {
      const fetchWelcomeMessage = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('venue-assistant', {
            body: {
              query: 'welcome',
              venueId: venue.id,
              type: 'welcome'
            }
          });
          
          if (error) throw new Error(error.message);
          
          if (data?.welcome) {
            welcomeTextRef.current = data.welcome;
            speakText(data.welcome);
            setIsWelcomePlayed(true);
            
            if (onAnswer) {
              onAnswer(data.welcome);
            }
          }
        } catch (err) {
          console.error('Failed to fetch welcome message:', err);
          welcomeTextRef.current = "Welcome to the venue assistant. How can I help you today?";
          speakText(welcomeTextRef.current);
          setIsWelcomePlayed(true);
          
          if (onAnswer) {
            onAnswer(welcomeTextRef.current);
          }
        }
      };
      
      fetchWelcomeMessage();
    }
  }, [venue, isWelcomePlayed, audioEnabled, speakText, onAnswer]);
  
  // Initialize speech recognition on mount
  useEffect(() => {
    initSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [initSpeechRecognition]);
  
  // Start listening function
  const startListening = useCallback(async () => {
    setError(null);
    
    if (!recognitionRef.current) {
      initSpeechRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        await recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setError('Could not access microphone. Please ensure you have granted the necessary permissions.');
        throw err;
      }
    } else {
      setError('Speech recognition is not available in your browser.');
    }
  }, [initSpeechRecognition]);
  
  // Stop listening function
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
    }
    setIsListening(false);
  }, []);
  
  // Toggle audio function
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
    
    // If turning off audio and currently speaking, stop it
    if (audioEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (onSpeechEnd) {
        onSpeechEnd();
      }
    }
  }, [audioEnabled, onSpeechEnd]);
  
  // Force play welcome message function
  const forcePlayWelcome = useCallback(() => {
    if (welcomeTextRef.current && audioEnabled) {
      speakText(welcomeTextRef.current);
      
      if (onAnswer) {
        onAnswer("Let me reintroduce myself. " + welcomeTextRef.current);
      }
    } else if (venue) {
      // Fetch welcome message if not available
      const fetchWelcomeMessage = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('venue-assistant', {
            body: {
              query: 'welcome',
              venueId: venue.id,
              type: 'welcome'
            }
          });
          
          if (error) throw new Error(error.message);
          
          if (data?.welcome) {
            welcomeTextRef.current = data.welcome;
            
            if (audioEnabled) {
              speakText(data.welcome);
            }
            
            setIsWelcomePlayed(true);
            
            if (onAnswer) {
              onAnswer(data.welcome);
            }
          }
        } catch (err) {
          console.error('Failed to fetch welcome message:', err);
        }
      };
      
      fetchWelcomeMessage();
    }
  }, [venue, audioEnabled, speakText, onAnswer]);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    isProcessing,
    audioEnabled,
    toggleAudio,
    isWelcomePlayed,
    forcePlayWelcome
  };
};
