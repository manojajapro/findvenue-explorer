
import { useRef } from "react";

export function useSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) {
      console.error("Sorry, your browser does not support speech synthesis.");
      return;
    }
    
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.01;
    
    // Handle events
    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      
      // Create a monitoring mechanism for cancel/interruption
      const checkSpeechState = setInterval(() => {
        if (!window.speechSynthesis.speaking && utteranceRef.current === utterance) {
          clearInterval(checkSpeechState);
          if (onEnd) onEnd();
        }
      }, 100);
      
      // Clean up interval on proper end
      utterance.addEventListener('end', () => {
        clearInterval(checkSpeechState);
      });
    }
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return { speak, stop };
}
