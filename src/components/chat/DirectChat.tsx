
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ErrorDisplay from './ErrorDisplay';
import ChatHeader from './ChatHeader';
import { useToast } from '@/components/ui/use-toast';

const DirectChat = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isSending) {
      sendMessage(e);
    }
  };

  if (hasError) {
    return <ErrorDisplay message={errorMessage || "An error occurred"} />;
  }

  if (!contact && isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-findvenue" />
      </div>
    );
  }

  if (!contact && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg font-medium text-findvenue-text-muted">Contact not found</p>
          <Button 
            onClick={() => navigate('/messages')} 
            className="mt-4 bg-findvenue hover:bg-findvenue-dark"
          >
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      {contact && <ChatHeader contact={contact} />}

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-findvenue" />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto p-4 scroll-smooth">
            {contact && (
              <MessageList 
                messages={messages} 
                userId={user?.id || ''} 
                contact={contact}
                messagesEndRef={messagesEndRef}
              />
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-white/10 bg-findvenue-surface/20 p-4">
        <MessageInput 
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={handleSendMessage}
          isDisabled={isLoading || hasError || !contact}
          isSending={isSending}
        />
      </div>
    </div>
  );
};

export default DirectChat;
