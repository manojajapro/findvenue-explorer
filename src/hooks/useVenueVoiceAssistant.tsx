
import { useState, useEffect, useRef, useCallback } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  autoRestart = false,
  onTranscript,
  onAnswer,
  onSpeechStart,
  onSpeechEnd
}: UseVenueVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isWelcomePlayed, setIsWelcomePlayed] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const welcomeTextRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const synth = useRef<SpeechSynthesis | null>(null);
  
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.onplay = () => {
      if (onSpeechStart && isMountedRef.current) onSpeechStart();
    };
    audioElementRef.current.onended = () => {
      if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
    };
    audioElementRef.current.onerror = () => {
      console.error('Audio playback error');
      if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
    };
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synth.current = window.speechSynthesis;
    }
    
    return () => {
      isMountedRef.current = false;
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, [onSpeechStart, onSpeechEnd]);
  
  const initSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      console.log("Speech recognition is available");
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        console.log("Speech recognition started");
        if (isMountedRef.current) setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        console.log("Speech recognition result:", transcript);
        
        if (isMountedRef.current) setTranscript(transcript);
        
        if (onTranscript && isMountedRef.current) {
          onTranscript(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (isMountedRef.current) {
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");
        if (isMountedRef.current) setIsListening(false);
      };
    } else {
      console.error("Speech recognition is NOT available");
      setError('Speech recognition not supported in this browser.');
    }
  }, [onTranscript]);
  
  const handleFinalTranscript = useCallback(async (text: string) => {
    if (!text.trim() || !venue || processingRef.current || !isMountedRef.current) return;
    
    try {
      setIsProcessing(true);
      processingRef.current = true;
      
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
      
      if (data?.answer && isMountedRef.current) {
        if (onAnswer) {
          onAnswer(data.answer);
        }
        
        if (audioEnabled) {
          await speakText(data.answer);
        }
      }
    } catch (err: any) {
      console.error('Error processing voice query:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to process your request');
      
        if (onAnswer) {
          onAnswer("I'm sorry, I encountered an error processing your request. Please try again.");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
        processingRef.current = false;
        setTranscript('');
      
        if (autoRestart && !error && isMountedRef.current && audioEnabled) {
          setTimeout(() => {
            startListening();
          }, 1000);
        }
      }
    }
  }, [venue, audioEnabled, onAnswer, autoRestart]);
  
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!text || !audioEnabled || !isMountedRef.current) return;
    
    try {
      if (onSpeechStart) onSpeechStart();
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voiceId: 'en-us-1' // Default voice
        }
      });
      
      if (error) throw new Error(error.message);
      
      // Check if we should use Web Speech API fallback
      if (data?.useWebSpeech) {
        console.log("Using Web Speech API fallback");
        return new Promise((resolve, reject) => {
          if (!synth.current) {
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            reject(new Error('Speech synthesis not available'));
            return;
          }
          
          // Cancel any ongoing speech
          synth.current.cancel();
          
          // Create utterance
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          
          utterance.onend = () => {
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            resolve();
          };
          
          utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            reject(new Error('Speech synthesis failed'));
          };
          
          // Speak
          synth.current.speak(utterance);
        });
      }
      
      // If we have audio data, play it
      if (data?.audio) {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
        }
        
        const audio = audioElementRef.current || new Audio();
        audio.src = `data:audio/mp3;base64,${data.audio}`;
        
        return new Promise((resolve, reject) => {
          const handleEnd = () => {
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (e: Event) => {
            console.error('Audio playback error:', e);
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            reject(new Error('Audio playback failed'));
          };
          
          audio.addEventListener('ended', handleEnd);
          audio.addEventListener('error', handleError);
          
          audio.play().catch(err => {
            console.error('Error playing audio:', err);
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            reject(err);
          });
        });
      } else {
        // Fallback to Web Speech API if no audio was returned
        return new Promise((resolve, reject) => {
          if (!synth.current) {
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            reject(new Error('Speech synthesis not available'));
            return;
          }
          
          // Cancel any ongoing speech
          synth.current.cancel();
          
          // Create utterance
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          
          utterance.onend = () => {
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            resolve();
          };
          
          utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
            reject(new Error('Speech synthesis failed'));
          };
          
          // Speak
          synth.current.speak(utterance);
        });
      }
    } catch (err: any) {
      console.error('Text-to-speech error:', err);
      
      // Fallback to Web Speech API
      if (synth.current && isMountedRef.current) {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          
          utterance.onend = () => {
            if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
          };
          
          synth.current.speak(utterance);
        } catch (synthError) {
          console.error('Web Speech API error:', synthError);
          if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
        }
      } else {
        if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
      }
      
      toast.error('Audio playback issue, using fallback voice');
    }
  }, [audioEnabled, onSpeechStart, onSpeechEnd]);
  
  useEffect(() => {
    if (venue && !isWelcomePlayed && audioEnabled && !welcomeTextRef.current && isMountedRef.current) {
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
          
          if (data?.welcome && isMountedRef.current) {
            welcomeTextRef.current = data.welcome;
            await speakText(data.welcome);
            setIsWelcomePlayed(true);
            
            if (onAnswer) {
              onAnswer(data.welcome);
            }
          }
        } catch (err) {
          console.error('Failed to fetch welcome message:', err);
          if (isMountedRef.current) {
            welcomeTextRef.current = "Welcome to the venue assistant. How can I help you today?";
            await speakText(welcomeTextRef.current);
            setIsWelcomePlayed(true);
            
            if (onAnswer) {
              onAnswer(welcomeTextRef.current);
            }
          }
        }
      };
      
      fetchWelcomeMessage();
    }
  }, [venue, isWelcomePlayed, audioEnabled, speakText, onAnswer]);
  
  useEffect(() => {
    initSpeechRecognition();
    
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, [initSpeechRecognition]);
  
  const startListening = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setError(null);
    
    if (!recognitionRef.current) {
      initSpeechRecognition();
    }
    
    console.log("Starting speech recognition...");
    
    if (recognitionRef.current) {
      try {
        await recognitionRef.current.start();
        console.log("Speech recognition started successfully");
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        if (isMountedRef.current) {
          setError('Could not access microphone. Please ensure you have granted the necessary permissions.');
        }
        throw err;
      }
    } else {
      console.error('Speech recognition is not available in your browser.');
      setError('Speech recognition is not available in your browser.');
      throw new Error('Speech recognition is not available in your browser.');
    }
  }, [initSpeechRecognition]);
  
  const stopListening = useCallback(() => {
    console.log("Stopping speech recognition...");
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
    }
    if (isMountedRef.current) setIsListening(false);
  }, []);
  
  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    
    if (synth.current) {
      synth.current.cancel();
    }
    
    if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
  }, [onSpeechEnd]);
  
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
    
    if (audioEnabled && audioElementRef.current) {
      stopSpeaking();
    }
  }, [audioEnabled, stopSpeaking]);
  
  const forcePlayWelcome = useCallback(async () => {
    if (welcomeTextRef.current && audioEnabled && isMountedRef.current) {
      await speakText(welcomeTextRef.current);
      
      if (onAnswer) {
        onAnswer("Let me reintroduce myself. " + welcomeTextRef.current);
      }
    } else if (venue && isMountedRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke('venue-assistant', {
          body: {
            query: 'welcome',
            venueId: venue.id,
            type: 'welcome'
          }
        });
        
        if (error) throw new Error(error.message);
        
        if (data?.welcome && isMountedRef.current) {
          welcomeTextRef.current = data.welcome;
          
          if (audioEnabled) {
            await speakText(data.welcome);
          }
          
          setIsWelcomePlayed(true);
          
          if (onAnswer) {
            onAnswer(data.welcome);
          }
        }
      } catch (err) {
        console.error('Failed to fetch welcome message:', err);
      }
    }
  }, [venue, audioEnabled, speakText, onAnswer]);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    error,
    isProcessing,
    audioEnabled,
    toggleAudio,
    isWelcomePlayed,
    forcePlayWelcome
  };
};
