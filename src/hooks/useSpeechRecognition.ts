
import { useRef, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ lang = "en-US", onResult, onEnd, onError }: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      onError?.("Speech recognition not supported");
      return;
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
        onError?.(e?.error || "Speech recognition error");
      };
      
      recog.onend = () => {
        if (onEnd) onEnd();
      };
      
      recognitionRef.current = recog;
      recog.start();
      console.log("Speech recognition started");
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      onError?.("Failed to start speech recognition");
    }
  }, [lang, onResult, onEnd, onError]);

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

  return { startListening, stopListening };
}
