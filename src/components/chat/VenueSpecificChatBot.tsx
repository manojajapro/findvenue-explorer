
import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import MessageList from '@/components/chat/MessageList';
import ChatHeader from '@/components/chat/ChatHeader';
import ErrorDisplay from '@/components/chat/ErrorDisplay';
import { type Message as ChatMessage } from '@/components/chat/types';

const VenueSpecificChatBot = () => {
  const { messages, isLoading, submitMessage, clearMessages, venue } = useChatWithVenue();
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
    <Card className="glass-card border-white/10 w-full max-w-md mx-auto">
      <ChatHeader 
        title={venue ? `About ${venue.name}` : 'Venue Assistant'} 
        description="Ask questions about this venue" 
      />
      
      <CardContent className="p-4 max-h-[50vh] overflow-y-auto">
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
          <MessageList messages={messages as unknown as ChatMessage[]} />
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t border-white/10">
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
      </CardFooter>
    </Card>
  );
};

export default VenueSpecificChatBot;
