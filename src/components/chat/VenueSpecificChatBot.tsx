
import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input'; 
import { Loader2 } from 'lucide-react';
import { useChatWithVenue } from '@/hooks/useChatWithVenue';
import { Badge } from '@/components/ui/badge';

interface VenueSpecificChatBotProps {
  onClose?: () => void;
  initialOpen?: boolean;
}

const VenueSpecificChatBot: React.FC<VenueSpecificChatBotProps> = ({ 
  onClose,
  initialOpen = false
}) => {
  const [message, setMessage] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  const { messages, isLoading, submitMessage, clearMessages, venue } = useChatWithVenue();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    const userMessage = message;
    setMessage('');
    await submitMessage(userMessage);
  };
  
  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const renderContent = () => {
    if (!venue) {
      return (
        <div className="flex flex-col items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-findvenue mb-4" />
          <p className="text-sm text-center text-findvenue-text-muted">
            Loading venue information...
          </p>
        </div>
      );
    }

    return (
      <>
        <CardHeader className="p-4 border-b border-white/10 flex flex-row justify-between items-center">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="Venue Assistant" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-white text-sm">{venue.name} Assistant</div>
              <div className="text-xs text-findvenue-text-muted">Ask anything about this venue</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={clearMessages} className="h-7 w-7 text-white/60 hover:text-white hover:bg-findvenue-surface/20">
              <RefreshCw size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7 text-white/60 hover:text-white hover:bg-findvenue-surface/20">
              <X size={14} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-12 h-12 mx-auto text-findvenue-text-muted opacity-50 mb-3" />
                <p className="text-findvenue-text-muted">
                  Ask anything about {venue.name}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['What are the prices?', 'Tell me about amenities', 'How to book?'].map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-findvenue-surface/20"
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
                        ? 'bg-findvenue text-white'
                        : 'bg-findvenue-surface/30 border border-white/10'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-findvenue-surface/30 border border-white/10">
                  <Loader2 className="h-5 w-5 animate-spin text-findvenue" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        
        <CardFooter className="p-3 pt-0 border-t border-white/10">
          <form onSubmit={handleSendMessage} className="w-full flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about this venue..."
              className="flex-1 bg-findvenue-surface/30 border-white/10"
              disabled={isLoading || !venue}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="bg-findvenue hover:bg-findvenue-dark" 
              disabled={!message.trim() || isLoading || !venue}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
            </Button>
          </form>
        </CardFooter>
      </>
    );
  };

  return (
    <>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-findvenue hover:bg-findvenue-dark shadow-lg p-0"
          aria-label="Open venue assistant"
        >
          <MessageSquare size={24} />
        </Button>
      ) : (
        <Card className="flex flex-col h-[80vh] max-h-[500px] w-full">
          {renderContent()}
        </Card>
      )}
    </>
  );
};

export default VenueSpecificChatBot;
