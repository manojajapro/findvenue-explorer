
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ErrorDisplay from './ErrorDisplay';

const DirectChat = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

  if (!user) {
    return (
      <Card className="glass-card border-white/10 h-[600px] flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-center text-findvenue-text-muted">Please log in to chat</p>
          <div className="mt-4 text-center">
            <Button onClick={() => navigate('/login')} className="bg-findvenue hover:bg-findvenue-dark">
              Log In
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (hasError) {
    return <ErrorDisplay message={errorMessage} />;
  }

  return (
    <Card className="glass-card border-white/10 h-[600px] flex flex-col">
      <ChatHeader contact={contact} />
      
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-findvenue" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <MessageList 
              messages={messages} 
              userId={user.id} 
              contact={contact}
              messagesEndRef={messagesEndRef}
            />
          </div>
        )}

        <MessageInput 
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={sendMessage}
          isDisabled={isLoading || hasError}
          isSending={isSending}
        />
      </div>
    </Card>
  );
};

export default DirectChat;
