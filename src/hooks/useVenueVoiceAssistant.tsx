
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
    
    return () => {
      isMountedRef.current = false;
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, [onSpeechStart, onSpeechEnd]);
  
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
        if (isMountedRef.current) setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        if (isMountedRef.current) setTranscript(transcript);
        
        if (onTranscript && isMountedRef.current) {
          onTranscript(transcript);
        }
        
        if (event.results[0].isFinal && isMountedRef.current) {
          handleFinalTranscript(transcript);
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
        if (isMountedRef.current) setIsListening(false);
        
        if (autoRestart && !processingRef.current && isMountedRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && !processingRef.current && isMountedRef.current) {
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
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Sarah voice by default
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (!data?.audio) throw new Error('No audio received from TTS service');
      
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
    } catch (err: any) {
      console.error('Text-to-speech error:', err);
      if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
      toast.error('Failed to play audio response');
      throw err;
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
    
    if (recognitionRef.current) {
      try {
        await recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        if (isMountedRef.current) {
          setError('Could not access microphone. Please ensure you have granted the necessary permissions.');
        }
        throw err;
      }
    } else {
      setError('Speech recognition is not available in your browser.');
    }
  }, [initSpeechRecognition]);
  
  const stopListening = useCallback(() => {
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
      if (onSpeechEnd && isMountedRef.current) onSpeechEnd();
    }
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
