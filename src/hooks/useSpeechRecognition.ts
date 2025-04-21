
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recog = new SpeechRecognition();
    recog.lang = lang;
    recog.interimResults = false;
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };
    recog.onerror = (e: Event & { error?: string }) => {
      onError?.(e?.error || "Speech recognition error");
    };
    recog.onend = onEnd || null;
    recognitionRef.current = recog;
    recog.start();
  }, [lang, onResult, onEnd, onError]);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return { startListening, stopListening };
}
