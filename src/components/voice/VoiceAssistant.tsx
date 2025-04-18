
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Speech recognition setup
  const recognition = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';
      
      recognition.current.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        handleVoiceCommand(speechResult);
        setIsListening(false);
      };
      
      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.error('Speech recognition not supported in this browser');
    }
  };
  
  // Start listening
  const startListening = () => {
    if (!recognition.current) {
      initSpeechRecognition();
    }
    
    if (recognition.current) {
      try {
        recognition.current.start();
        setIsListening(true);
        setTranscript('');
        setResponse('');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };
  
  // Stop listening
  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };
  
  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    let responseText = '';
    
    // Simple command handling logic - in a real app, connect to an AI service
    if (lowerCommand.includes('find venue') || lowerCommand.includes('search')) {
      responseText = 'I can help you search for venues. What type of event are you planning?';
    } else if (lowerCommand.includes('wedding venue') || lowerCommand.includes('wedding space')) {
      responseText = 'I found 58 wedding venues across Saudi Arabia. The most popular ones are in Riyadh and Jeddah. Would you like me to list some options?';
    } else if (lowerCommand.includes('riyadh')) {
      responseText = 'Riyadh has 245 venues available. Popular options include the Four Seasons Ballroom and Waldorf Grand Hall.';
    } else if (lowerCommand.includes('jeddah')) {
      responseText = 'There are 178 venues in Jeddah. Many feature beautiful views of the Red Sea. The Marsa Beach Venue is highly rated.';
    } else if (lowerCommand.includes('capacity') || lowerCommand.includes('guest')) {
      responseText = 'I can filter venues by capacity. The largest venue in our system can accommodate up to 1,200 guests.';
    } else if (lowerCommand.includes('price') || lowerCommand.includes('cost')) {
      responseText = 'Venues range in price from 5,000 to 50,000 SAR, depending on location, size, and amenities.';
    } else if (lowerCommand.includes('thank you') || lowerCommand.includes('thanks')) {
      responseText = 'You\'re welcome! Is there anything else I can help you with?';
    } else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      responseText = 'Hello! I\'m your FindVenue voice assistant. How can I help you today?';
    } else {
      responseText = 'I didn\'t quite understand that. You can ask me to search for venues, find spaces in specific cities, or get details about venue capacities and pricing.';
    }
    
    setResponse(responseText);
    speakResponse(responseText);
  };
  
  // Text-to-speech
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance();
      speech.text = text;
      speech.volume = 1;
      speech.rate = 1;
      speech.pitch = 1;
      
      // Use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Female'));
      if (preferredVoice) {
        speech.voice = preferredVoice;
      }
      
      speech.onstart = () => setIsSpeaking(true);
      speech.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(speech);
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  return (
    <>
      {/* Voice assistant button */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            isOpen ? "bg-findvenue-dark" : "bg-findvenue"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </div>
      
      {/* Voice assistant panel */}
      <div
        className={cn(
          "fixed bottom-24 left-6 z-50 w-full max-w-md transition-all duration-500 transform",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
        )}
      >
        <Card className="overflow-hidden border border-white/10 shadow-xl bg-findvenue-card-bg">
          {/* Header */}
          <div className="bg-findvenue p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Volume2 className="h-5 w-5 mr-2 text-white" />
              <h3 className="font-semibold text-white">Voice Assistant</h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-findvenue-dark"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Voice assistant content */}
          <div className="p-6 flex flex-col items-center">
            {isListening ? (
              <>
                <div className="w-20 h-20 rounded-full bg-findvenue-surface flex items-center justify-center mb-6 relative">
                  <div className="absolute w-full h-full rounded-full bg-findvenue/20 animate-ping"></div>
                  <Mic className="h-8 w-8 text-findvenue" />
                </div>
                <p className="text-center text-lg font-medium mb-2">Listening...</p>
                <p className="text-center text-findvenue-text-muted text-sm mb-6">
                  Speak clearly into your microphone
                </p>
                <Button 
                  variant="outline" 
                  className="border-findvenue-gold text-findvenue-gold hover:bg-findvenue-gold/10"
                  onClick={stopListening}
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-findvenue-surface flex items-center justify-center mb-6">
                  <Mic className="h-8 w-8 text-findvenue" />
                </div>
                
                {transcript && (
                  <div className="w-full mb-4">
                    <p className="text-sm text-findvenue-text-muted mb-2">You said:</p>
                    <div className="p-3 bg-findvenue-surface/50 rounded-lg text-findvenue-text">
                      {transcript}
                    </div>
                  </div>
                )}
                
                {response && (
                  <div className="w-full mb-6">
                    <p className="text-sm text-findvenue-text-muted mb-2">Assistant:</p>
                    <div className="p-3 bg-findvenue/10 rounded-lg text-findvenue-text">
                      {response}
                    </div>
                  </div>
                )}
                
                {isSpeaking ? (
                  <Button 
                    className="bg-findvenue-dark hover:bg-findvenue-dark/80"
                    onClick={stopSpeaking}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop Speaking
                  </Button>
                ) : (
                  <Button 
                    className="bg-findvenue hover:bg-findvenue-dark"
                    onClick={startListening}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Start Speaking
                  </Button>
                )}
              </>
            )}
          </div>
          
          {/* Tips */}
          <div className="p-4 border-t border-white/10 bg-findvenue-dark-bg/75">
            <p className="text-xs text-findvenue-text-muted text-center">
              Try saying: "Find wedding venues in Riyadh" or "Show me venues for 200 guests"
            </p>
          </div>
        </Card>
      </div>
    </>
  );
};

export default VoiceAssistant;
