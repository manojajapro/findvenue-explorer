
import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Message, ChatContact } from './types';

type MessageListProps = {
  messages: Message[];
  userId: string;
  contact: ChatContact;
  messagesEndRef: React.RefObject<HTMLDivElement>;
};

const MessageList = ({ messages, userId, contact, messagesEndRef }: MessageListProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  if (messages.length === 0) {
    return (
      <p className="text-center text-findvenue-text-muted py-4">
        No messages yet. Start the conversation!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {contact.venueName && (
        <div className="text-center mb-4">
          <Badge variant="outline" className="bg-findvenue/10 text-findvenue">
            Conversation about {contact.venueName}
          </Badge>
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-lg px-4 py-2 ${
              message.sender_id === userId
                ? 'bg-findvenue text-white'
                : 'bg-findvenue-card-bg border border-findvenue-border'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            <p className={`text-xs mt-1 ${
              message.sender_id === userId ? 'text-white/70' : 'text-findvenue-text-muted'
            }`}>
              {formatTime(message.created_at)}
            </p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
