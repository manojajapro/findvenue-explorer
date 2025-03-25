
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  content: string;
  isBot: boolean;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    content: 'Hello! I\'m your FindVenue assistant. How can I help you find the perfect venue today?',
    isBot: true,
    timestamp: new Date()
  }
];

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      content: inputMessage,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    // Simulate bot response after delay
    setTimeout(() => {
      const botMessage: Message = {
        content: getBotResponse(inputMessage),
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };
  
  // Simple response logic - in a real app, this would be connected to an AI service
  const getBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('venue') || lowerMessage.includes('space') || lowerMessage.includes('location')) {
      return 'We have many beautiful venues across Saudi Arabia. You can search by city, event type, or guest count using our search feature. Is there a specific type of venue you\'re looking for?';
    } else if (lowerMessage.includes('wedding')) {
      return 'For weddings, I recommend checking out our luxury ballrooms in Riyadh or beachfront venues in Jeddah. These are very popular for wedding celebrations.';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
      return 'Venue prices vary based on location, size, and amenities. Our venues start from 10,000 SAR. You can filter by price range in our search to find options within your budget.';
    } else if (lowerMessage.includes('riyadh')) {
      return 'Riyadh has over 200 premium venues ranging from luxury ballrooms to corporate conference centers. The Four Seasons Ballroom and Waldorf Grand Hall are among our most popular options.';
    } else if (lowerMessage.includes('jeddah')) {
      return 'Jeddah offers beautiful beachfront venues with Red Sea views, as well as modern event spaces in the city center. The Marsa Beach Venue is especially popular for outdoor events.';
    } else if (lowerMessage.includes('book') || lowerMessage.includes('reserve')) {
      return 'To book a venue, you can browse our listings, select your preferred venue, and click the "Book Now" button on the venue details page. You'll need to create an account to complete your booking.';
    } else if (lowerMessage.includes('thank')) {
      return 'You\'re welcome! I\'m glad I could help. Feel free to ask if you have any other questions about finding the perfect venue.';
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! How can I help you find the perfect venue today?';
    } else {
      return 'I can help you find and book venues across Saudi Arabia. You can ask about specific cities, venue types, or booking procedures. How can I assist you today?';
    }
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <>
      {/* Chat button */}
      <div className="fixed bottom-6 right-6 z-50">
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
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>
      
      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-full max-w-md transition-all duration-500 transform",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0 pointer-events-none"
        )}
      >
        <Card className="overflow-hidden border border-white/10 shadow-xl bg-findvenue-card-bg">
          {/* Header */}
          <div className="bg-findvenue p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="h-5 w-5 mr-2 text-white" />
              <h3 className="font-semibold text-white">FindVenue Assistant</h3>
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
          
          {/* Messages area */}
          <div className="p-4 h-96 overflow-y-auto flex flex-col gap-4 bg-findvenue-dark-bg/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col max-w-[80%] animate-fade-in",
                  msg.isBot ? "self-start" : "self-end"
                )}
              >
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    msg.isBot 
                      ? "bg-findvenue-surface text-findvenue-text rounded-tl-none" 
                      : "bg-findvenue text-white rounded-tr-none"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-findvenue-text-muted mt-1">
                  {msg.isBot ? 'Bot' : 'You'} • {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            
            {isTyping && (
              <div className="self-start flex flex-col max-w-[80%] animate-fade-in">
                <div className="p-3 rounded-lg bg-findvenue-surface text-findvenue-text rounded-tl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-findvenue-text-muted animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-findvenue-text-muted animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-findvenue-text-muted animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-findvenue-dark-bg/75">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="bg-findvenue-surface border-white/10"
              />
              <Button 
                type="submit" 
                className="bg-findvenue hover:bg-findvenue-dark"
                disabled={!inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
};

export default ChatBot;
