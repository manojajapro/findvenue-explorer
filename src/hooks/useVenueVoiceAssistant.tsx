
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCount = useRef(0);
  const autoRestartTimeout = useRef<number | null>(null);
  
  // Initialize audio element for playing responses
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      console.log('Audio playback ended');
      if (autoRestart) {
        // Auto restart listening after audio ends
        const timer = setTimeout(() => {
          console.log('Auto-restarting voice recognition after audio...');
          startListening();
        }, 1000);
        autoRestartTimeout.current = timer as unknown as number;
      }
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (autoRestartTimeout.current) {
        clearTimeout(autoRestartTimeout.current);
      }
    };
  }, [autoRestart]);
  
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
      
      // 1. Call venue-assistant to get text response
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
        
        // Only try text-to-speech if audio is enabled
        if (audioEnabled) {
          // 2. Call text-to-speech to convert response to audio
          try {
            console.log('Starting text-to-speech conversion...');
            const response = await supabase.functions.invoke('text-to-speech', {
              body: {
                text: data.answer,
                voice: 'alloy' // You can customize the voice here
              },
              responseType: 'arraybuffer'
            });
            
            if (response.error) {
              throw new Error(response.error.message);
            }
            
            console.log('Received audio data, creating audio element...');
            // Create blob from array buffer
            const blob = new Blob([response.data], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            
            if (audioRef.current) {
              audioRef.current.src = url;
              audioRef.current.oncanplaythrough = () => {
                if (audioRef.current) {
                  console.log('Audio ready to play');
                  audioRef.current.play()
                    .catch(e => {
                      console.error('Error playing audio:', e);
                      // Fall back to browser TTS
                      useBrowserTTS(data.answer);
                    });
                  
                  // Clean up blob URL when audio is done
                  audioRef.current.onended = () => {
                    URL.revokeObjectURL(url);
                    console.log('Audio playback completed');
                    
                    // Auto restart listening after response
                    if (autoRestart) {
                      console.log('Setting up auto-restart after audio...');
                      const timer = setTimeout(() => {
                        console.log('Auto-restarting voice recognition...');
                        startListening();
                      }, 1000);
                      autoRestartTimeout.current = timer as unknown as number;
                    }
                  };
                }
              };
              
              audioRef.current.onerror = () => {
                console.error('Audio element error');
                URL.revokeObjectURL(url);
                // Fall back to browser TTS
                useBrowserTTS(data.answer);
              };
            }
          } catch (speechError) {
            console.error('Error generating speech:', speechError);
            // Fallback to browser's speech synthesis
            useBrowserTTS(data.answer);
          }
        } else if (autoRestart) {
          // If audio is disabled but autoRestart is enabled, restart after a delay
          const timer = setTimeout(() => {
            console.log('Auto-restarting voice recognition (audio disabled)...');
            startListening();
          }, 3000); // Longer delay when audio is disabled
          autoRestartTimeout.current = timer as unknown as number;
        }
      } else {
        throw new Error('No answer received from AI assistant');
      }
    } catch (err: any) {
      console.error('Error processing voice query:', err);
      setError(err.message);
      toast.error('Error processing your request', {
        description: err.message || 'Please try again later'
      });
      
      // If we encounter an error and have retry attempts left
      if (retryCount.current < 2) {
        retryCount.current++;
        console.log(`Retrying (${retryCount.current}/2)...`);
        setTimeout(() => processVoiceQuery(query), 1000);
        return;
      }
      
      retryCount.current = 0;
      
      // Auto restart listening after error
      if (autoRestart) {
        const timer = setTimeout(() => {
          console.log('Auto-restarting voice recognition after error...');
          startListening();
        }, 3000); // Longer delay after error
        autoRestartTimeout.current = timer as unknown as number;
      }
    } finally {
      setIsProcessing(false);
    }
  }, [venue?.id, onAnswer, audioEnabled, autoRestart]);
  
  // Helper function to use browser's built-in TTS as fallback
  const useBrowserTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      console.log('Using browser TTS as fallback');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      
      // Set callback to restart listening after speech ends
      if (autoRestart) {
        utterance.onend = () => {
          console.log('Browser TTS playback ended, auto-restarting...');
          const timer = setTimeout(() => {
            startListening();
          }, 1000);
          autoRestartTimeout.current = timer as unknown as number;
        };
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Browser TTS not available');
      
      // Even without TTS, restart listening if enabled
      if (autoRestart) {
        const timer = setTimeout(() => {
          console.log('Auto-restarting voice recognition (no TTS)...');
          startListening();
        }, 3000);
        autoRestartTimeout.current = timer as unknown as number;
      }
    }
  };
  
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
      
      // Clear any pending auto-restart timers
      if (autoRestartTimeout.current) {
        clearTimeout(autoRestartTimeout.current);
      }
    };
  }, [isListening]);
  
  const startListening = useCallback(() => {
    // Clear any existing auto-restart timers
    if (autoRestartTimeout.current) {
      clearTimeout(autoRestartTimeout.current);
      autoRestartTimeout.current = null;
    }
    
    if (!recognition.current) {
      setError('Speech recognition is not supported in your browser.');
      return Promise.reject(new Error('Speech recognition not supported'));
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
        
        // Auto restart listening after error
        if (autoRestart) {
          const timer = setTimeout(() => {
            console.log('Auto-restarting voice recognition after error...');
            startListening();
          }, 3000); // Longer delay after error
          autoRestartTimeout.current = timer as unknown as number;
        }
      };
      
      recognition.current.onend = () => {
        handleSpeechEnd();
      };
      
      recognition.current.start();
      
      // Reset retry counter on new listening session
      retryCount.current = 0;
      return Promise.resolve();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setError(err.message);
      setIsListening(false);
      
      if (onListeningChange) {
        onListeningChange(false);
      }
      
      return Promise.reject(err);
    }
  }, [handleSpeechStart, handleSpeechEnd, onTranscript, onListeningChange, autoRestart]);
  
  const stopListening = useCallback(() => {
    // Clear any existing auto-restart timers
    if (autoRestartTimeout.current) {
      clearTimeout(autoRestartTimeout.current);
      autoRestartTimeout.current = null;
    }
    
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
  
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
  }, []);
  
  return {
    isListening,
    transcript,
    answer,
    error,
    isProcessing,
    audioEnabled,
    startListening,
    stopListening,
    setTranscript,
    toggleAudio
  };
};

export default useVenueVoiceAssistant;
