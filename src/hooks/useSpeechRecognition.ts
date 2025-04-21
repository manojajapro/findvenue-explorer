
import { useRef, useCallback, useState, useEffect } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ 
  lang = "en-US", 
  onResult, 
  onEnd, 
  onError 
}: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  
  // Check browser support on mount
  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSupported(supported);
    
    if (!supported && onError) {
      onError("Speech recognition not supported in this browser");
    }
  }, [onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.("Speech recognition not supported");
      return Promise.reject(new Error("Speech recognition not supported"));
    }
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      // Stop any existing recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping previous recognition:", e);
        }
      }
      
      const recog = new SpeechRecognition();
      recog.lang = lang;
      recog.interimResults = false;
      recog.continuous = false;
      
      recog.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results[0][0].transcript;
        onResult(transcript);
      };
      
      recog.onerror = (e: Event & { error?: string }) => {
        console.error("Speech recognition error:", e);
        onError?.(e?.error || "Speech recognition error");
      };
      
      recog.onend = () => {
        if (onEnd) onEnd();
      };
      
      recognitionRef.current = recog;
      
      return new Promise<void>((resolve, reject) => {
        try {
          recog.start();
          console.log("Speech recognition started");
          resolve();
        } catch (err) {
          console.error("Failed to start speech recognition:", err);
          onError?.("Failed to start speech recognition");
          reject(err);
        }
      });
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      onError?.("Failed to initialize speech recognition");
      return Promise.reject(err);
    }
  }, [lang, onResult, onEnd, onError, isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("Speech recognition stopped");
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
  }, []);

  return { 
    startListening, 
    stopListening,
    isSupported 
  };
}
