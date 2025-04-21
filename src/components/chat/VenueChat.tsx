import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Volume2, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  venues?: VenueResult[];
}

interface VenueResult {
  id: string;
  name: string;
  city: string;
  type: string;
  capacity: string;
  price: string;
  pricePerPerson?: string | null;
  rating: string;
  reviews: number;
  amenities: string[];
  features: {
    wifi: boolean;
    parking: boolean;
    featured: boolean;
    popular: boolean;
  };
  image: string | null;
  description: string | null;
  address: string | null;
  status: string;
}

const suggestedQueries = [
  "Find wedding venues in Riyadh",
  "Show me conference halls with WiFi",
  "Venues under 1000 SAR",
  "Outdoor venues for 100 people",
  "Luxury venues with parking"
];

export default function VenueChat() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: "👋 Hello! I'm your venue assistant. How can I help you find the perfect venue today?",
    timestamp: Date.now()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/venue-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.answer,
        timestamp: Date.now(),
        venues: data.venues
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
      toast.error('Failed to get response', {
        description: 'Please try again with a different query'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: "👋 Hello! I'm your venue assistant. How can I help you find the perfect venue today?",
      timestamp: Date.now()
    }]);
    setShowSuggestions(true);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 bg-slate-900/90 border-slate-600 shadow-xl">
      <div className="bg-slate-800 p-4 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-500 h-6 w-6" />
          <div>
            <h2 className="font-semibold text-white">Venue Assistant</h2>
            <p className="text-sm text-slate-400">Find your perfect venue</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Chat
        </Button>
      </div>

      <ScrollArea className="h-[500px] p-4">
        <div className="space-y-4">
          {showSuggestions && (
            <div className="mb-6">
              <p className="text-sm text-slate-400 mb-2">Try asking about:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((query, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-500/10"
                    onClick={() => handleSendMessage(query)}
                  >
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%]">
                <div className={`flex items-start gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}>
                  <div className={`rounded-full p-2 ${
                    message.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'
                  }`}>
                    {message.role === 'user' ? (
                      <span className="text-white font-bold">U</span>
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <div className={`rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-100'
                    }`}>
                      {message.content}
                    </div>
                    
                    {message.venues && message.venues.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.venues.map((venue) => (
                          <Link
                            key={venue.id}
                            to={`/venue/${venue.id}`}
                            className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {venue.image && (
                                <img
                                  src={venue.image}
                                  alt={venue.name}
                                  className="w-16 h-16 rounded-md object-cover"
                                />
                              )}
                              <div>
                                <h3 className="font-medium text-white">{venue.name}</h3>
                                <p className="text-sm text-slate-400">{venue.city}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {venue.capacity}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {venue.price}
                                  </Badge>
                                  {venue.rating !== 'Unrated' && (
                                    <Badge variant="outline" className="text-xs">
                                      ⭐ {venue.rating}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs text-slate-500 mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="rounded-full p-2 bg-slate-700">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-700">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about venues..."
              className="bg-slate-800 border-slate-700 pr-10"
              disabled={isLoading}
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>
    </Card>
  );
} 