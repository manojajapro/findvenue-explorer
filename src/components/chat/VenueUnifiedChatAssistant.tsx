
import React, { useState, useEffect, useRef } from 'react';
import { Venue } from '@/hooks/useSupabaseVenues';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface VenueUnifiedChatAssistantProps {
  venue: Venue | null;
  onClose?: () => void;
}

const VenueUnifiedChatAssistant = ({ venue, onClose }: VenueUnifiedChatAssistantProps) => {
  const { messages, isLoading, submitMessage } = useChatWithVenue();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isLoading) return;
    
    const messageContent = newMessage;
    setNewMessage('');
    await submitMessage(messageContent);
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-12 h-12 mx-auto text-blue-400 opacity-50 mb-3" />
              <p className="text-white/70">
                {venue ? `Ask anything about ${venue.name}` : 'Ask anything about our venues'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['Tell me about this venue', 'What amenities are available?', 'How to book?'].map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-white/10"
                    onClick={() => {
                      submitMessage(suggestion);
                    }}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-gray-800 border border-gray-700">
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border-gray-700"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="bg-blue-600 hover:bg-blue-700" 
            disabled={!newMessage.trim() || isLoading}
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VenueUnifiedChatAssistant;
