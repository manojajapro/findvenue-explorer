
import { useRef, useState, useEffect } from "react";

export function useSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if speech synthesis is supported
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setIsSupported(supported);
    
    // Return cleanup function
    return () => {
      if (supported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!isSupported) {
      console.error("Sorry, your browser does not support speech synthesis.");
      return;
    }
    
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    try {
      const utterance = new window.SpeechSynthesisUtterance(text);
      
      // Auto-detect language based on text content
      if (/[\u0600-\u06FF]/.test(text)) {
        // If Arabic characters are detected
        utterance.lang = "ar-SA";
        utterance.rate = 0.9; // Slightly slower rate for Arabic
      } else {
        utterance.lang = "en-US";
        utterance.rate = 1.01;
      }
      
      // Handle events
      if (onStart) {
        utterance.onstart = () => {
          onStart();
        };
      }
      
      if (onEnd) {
        utterance.onend = () => {
          onEnd();
        };
        
        utterance.onerror = () => {
          console.error("Speech synthesis error");
          onEnd();
        };
        
        // Create a monitoring mechanism for cancel/interruption
        const checkSpeechState = setInterval(() => {
          if (!window.speechSynthesis.speaking && utteranceRef.current === utterance) {
            clearInterval(checkSpeechState);
            onEnd();
          }
        }, 100);
        
        // Clean up interval on proper end
        utterance.addEventListener('end', () => {
          clearInterval(checkSpeechState);
        });
        
        // Clean up interval on error
        utterance.addEventListener('error', () => {
          clearInterval(checkSpeechState);
        });
      }
      
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Error during speech synthesis:", err);
      if (onEnd) onEnd();
    }
  };

  const stop = () => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      if (utteranceRef.current) {
        utteranceRef.current = null;
      }
    }
  };

  return { speak, stop, isSupported };
}
