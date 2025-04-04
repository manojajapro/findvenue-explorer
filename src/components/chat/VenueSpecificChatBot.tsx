
import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, RefreshCw, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import ErrorDisplay from '@/components/chat/ErrorDisplay';
import { Venue } from '@/hooks/useSupabaseVenues';
import { ScrollArea } from '@/components/ui/scroll-area';

type VenueSpecificChatBotProps = {
  venue: Venue;
};

const VenueSpecificChatBot = ({ venue }: VenueSpecificChatBotProps) => {
  const { messages, isLoading, submitMessage, clearMessages } = useChatWithVenue();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      submitMessage(inputValue);
      setInputValue('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus the input field when the component mounts
    inputRef.current?.focus();
  }, []);

  return (
    <div className="bg-findvenue-card-bg border border-white/10 rounded-lg p-4 mt-6">
      <ScrollArea className="h-60 mb-4 rounded-md border border-white/10 p-4">
        {!venue && !isLoading ? (
          <ErrorDisplay message="Could not load venue information." />
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-findvenue-text-muted mb-2">
              {venue 
                ? `Ask me anything about ${venue.name}` 
                : 'Loading venue information...'}
            </p>
            {venue && (
              <p className="text-sm text-findvenue-text-muted">
                Try asking about capacity, amenities, pricing, or location
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex gap-2 p-3 rounded-lg text-sm ${
                  message.role === 'user' 
                    ? 'bg-findvenue/20 ml-8' 
                    : 'bg-gray-700/30 mr-8'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4 mt-1 shrink-0" />
                ) : (
                  <Bot className="h-4 w-4 mt-1 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-medium mb-1">{message.role === 'user' ? 'You' : 'Assistant'}</p>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        {messages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={clearMessages}
            disabled={isLoading || messages.length === 0}
            title="Clear conversation"
            className="border-white/10 bg-findvenue-surface/50 hover:bg-findvenue-surface"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask about this venue..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="bg-findvenue-surface/50 border-white/10 flex-grow"
            disabled={isLoading || !venue}
          />
          
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim() || !venue}
            className="bg-findvenue hover:bg-findvenue-dark"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VenueSpecificChatBot;
