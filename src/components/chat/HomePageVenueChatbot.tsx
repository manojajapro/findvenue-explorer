
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Bot, Mic, X } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function HomePageVenueChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  
  const { speak, stop: stopSpeaking, isSupported: isSpeechSupported } = useSpeechSynthesis();

  // Define handleSpeakResponse before it's used
  const handleSpeakResponse = useCallback((text: string) => {
    if (!text || !isSpeechSupported) return;

    // Detect if the text contains Arabic characters
    const containsArabic = /[\u0600-\u06FF]/.test(text);
    
    speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      {
        lang: containsArabic ? 'ar-SA' : 'en-US', // Set language based on content
        rate: containsArabic ? 0.9 : 1.0 // Slightly slower rate for Arabic
      }
    );
  }, [speak, isSpeechSupported]);
  
  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  const handleUserMessage = useCallback((message: string) => {
    setMessages(prevMessages => [...prevMessages, `You: ${message}`]);
    setNewMessage('');
    
    // Simulate bot response (replace with actual bot logic)
    setTimeout(() => {
      const botResponse = `Bot: I received your message: ${message}`;
      setMessages(prevMessages => [...prevMessages, botResponse]);
      handleSpeakResponse(botResponse);
    }, 500);
  }, [handleSpeakResponse]);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      handleUserMessage(newMessage);
    }
  }, [newMessage, handleUserMessage]);

  const { startListening, stopListening, isSupported } = useSpeechRecognition({
    lang: 'ar-SA,en-US', // Support both Arabic and English
    onResult: (text) => {
      if (text.trim()) {
        handleUserMessage(text);
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
      toast.error('Speech recognition error. Please try again.');
      setIsListening(false);
    }
  });

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed left-4 bottom-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="AI Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-950 text-white border-blue-800">
            <p>Chat with Venue Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[500px] p-0 overflow-hidden left-[5%] sm:left-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl"
          aria-describedby="chatbot-description"
        >
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <div className="h-[calc(75vh-6rem)] overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`mb-2 rounded-md px-3 py-2 ${message.startsWith('You:') ? 'bg-blue-700 text-white self-end' : 'bg-gray-800 text-gray-300 self-start'}`}>
                {message}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow bg-slate-800 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <Button type="submit" className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 focus:outline-none">
                Send
              </Button>
              {isSupported && (
                <Button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                      setIsListening(false);
                    } else {
                      startListening()
                        .then(() => setIsListening(true))
                        .catch(() => setIsListening(false));
                    }
                  }}
                  className={`rounded-full p-2 ${isListening ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'}`}
                >
                  <Mic className="h-5 w-5 text-white" />
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
