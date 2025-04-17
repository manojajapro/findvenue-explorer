
import { useState, useRef, useEffect } from 'react';
import { User, Bot, Send, RefreshCw, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VenueUnifiedChatAssistantProps {
  venue: Venue | null;
  onClose?: () => void;
}

const VenueUnifiedChatAssistant = ({ venue, onClose }: VenueUnifiedChatAssistantProps) => {
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, submitMessage, clearMessages } = useChatWithVenue();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      submitMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Chat header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://static.vecteezy.com/system/resources/previews/011/490/381/original/happy-smiling-young-man-avatar-3d-portrait-of-a-man-cartoon-character-people-illustration-isolated-on-white-background-vector.jpg" alt="AI" />
            <AvatarFallback className="bg-blue-600">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white">Venue Assistant</h3>
            <p className="text-xs text-gray-400">{venue?.name || 'Ask me anything about this venue'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            <span className="sr-only sm:not-sr-only sm:inline-block">Reset</span>
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 border border-white/10 text-gray-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-gray-800 border border-white/10">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 p-4 flex gap-2"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            isLoading
              ? 'Please wait...'
              : `Ask about ${venue?.name || 'this venue'}...`
          }
          className="flex-1 bg-gray-800/60 border-gray-700 focus-visible:ring-blue-500"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className={isLoading ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default VenueUnifiedChatAssistant;
