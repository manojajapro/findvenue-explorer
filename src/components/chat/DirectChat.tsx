import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ErrorDisplay from './ErrorDisplay';

const DirectChat = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  
  const { 
    contact,
    messages, 
    newMessage, 
    setNewMessage,
    isLoading, 
    isSending, 
    hasError, 
    errorMessage, 
    messagesEndRef,
    sendMessage
  } = useChat(contactId);

  // Only scroll to bottom for new messages in current chat
  useEffect(() => {
    if (!messages.length || !chatContainerRef.current) return;

    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage?.id !== lastMessageRef.current;
    const isUserMessage = lastMessage?.sender_id === user?.id;

    // Only auto-scroll if it's a new message and either:
    // 1. It's sent by the current user
    // 2. The user is already at the bottom of the chat
    if (isNewMessage) {
      const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isUserMessage || isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      lastMessageRef.current = lastMessage?.id;
    }
  }, [messages, user?.id]);

  // Reset scroll position when switching chats
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
      lastMessageRef.current = null;
    }
  }, [contactId]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg font-medium mb-4 text-findvenue-text-muted">Please log in to chat</p>
          <Button onClick={() => navigate('/login')} className="bg-findvenue hover:bg-findvenue-dark">
            Log In
          </Button>
        </div>
      </div>
    );
  }

  if (hasError) {
    return <ErrorDisplay message={errorMessage} />;
  }

  if (!contact && isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-findvenue" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg font-medium text-findvenue-text-muted">Contact not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-findvenue-surface/20">
        <div className="p-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-findvenue-surface/50" 
            onClick={() => navigate('/messages')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 border-2 border-white/10">
              <AvatarImage src={contact.image} alt={contact.name} />
              <AvatarFallback className="bg-findvenue text-white font-medium">
                {contact.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">
                  {contact.name}
                </h3>
                {contact.role && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-findvenue-text-muted">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-findvenue" />
          </div>
        ) : (
          <div 
            ref={chatContainerRef}
            className="absolute inset-0 overflow-y-auto p-4 scroll-smooth"
          >
            <MessageList 
              messages={messages} 
              userId={user.id} 
              contact={contact}
              messagesEndRef={messagesEndRef}
            />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-white/10 bg-findvenue-surface/20 p-4">
        <MessageInput 
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={sendMessage}
          isDisabled={isLoading || hasError}
          isSending={isSending}
        />
      </div>
    </div>
  );
};

export default DirectChat;
