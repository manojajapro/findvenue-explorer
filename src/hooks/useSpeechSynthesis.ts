
import { useRef, useState, useEffect } from "react";

interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setIsSupported(supported);
    
    return () => {
      if (supported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void,
    options: SpeakOptions = {}
  ) => {
    if (!isSupported) {
      console.error("Sorry, your browser does not support speech synthesis.");
      return;
    }
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    try {
      const utterance = new window.SpeechSynthesisUtterance(text);
      
      // Apply options with defaults
      utterance.lang = options.lang || "en-US";
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      if (onStart) {
        utterance.onstart = onStart;
      }
      
      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = () => {
          console.error("Speech synthesis error");
          onEnd();
        };
        
        const checkSpeechState = setInterval(() => {
          if (!window.speechSynthesis.speaking && utteranceRef.current === utterance) {
            clearInterval(checkSpeechState);
            onEnd();
          }
        }, 100);
        
        utterance.addEventListener('end', () => {
          clearInterval(checkSpeechState);
        });
        
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

