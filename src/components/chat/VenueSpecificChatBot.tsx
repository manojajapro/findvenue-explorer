
import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import ErrorDisplay from '@/components/chat/ErrorDisplay';
import { Venue } from '@/hooks/useSupabaseVenues';

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

  return (
    <>
      <div className="max-h-[50vh] overflow-y-auto mb-4">
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
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`px-4 py-2 rounded-lg max-w-[80%] ${
                    message.role === 'user' 
                      ? 'bg-findvenue text-white rounded-tr-none' 
                      : 'bg-findvenue-surface/50 text-findvenue-text rounded-tl-none'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <Input
          ref={inputRef}
          placeholder="Ask about this venue..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="bg-findvenue-surface/50 border-white/10"
          disabled={isLoading || !venue}
        />
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
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !inputValue.trim() || !venue}
          className="bg-findvenue hover:bg-findvenue-dark"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </>
  );
};

export default VenueSpecificChatBot;
