
import { useRef } from "react";

export function useSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) {
      alert("Sorry, your browser does not support speech synthesis.");
      return;
    }
    if (utteranceRef.current) {
      window.speechSynthesis.cancel(); // Stop previous
    }
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.01;
    utterance.onstart = onStart || null;
    utterance.onend = onEnd || null;
    utterance.oncancel = onEnd || null;
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
