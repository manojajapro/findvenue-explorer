
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

type MessageInputProps = {
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  isDisabled: boolean;
  isSending: boolean;
};

const MessageInput = ({ 
  newMessage, 
  setNewMessage, 
  sendMessage, 
  isDisabled, 
  isSending 
}: MessageInputProps) => {
  return (
    <form onSubmit={sendMessage} className="flex gap-2">
      <Input
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isDisabled}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (newMessage.trim()) sendMessage(e);
          }
        }}
      />
      <Button 
        type="submit" 
        disabled={isDisabled || isSending || !newMessage.trim()} 
        className="bg-findvenue hover:bg-findvenue-dark"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};

export default MessageInput;
