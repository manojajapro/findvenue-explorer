
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

type Message = {
  id: string;
  created_at: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  read: boolean;
  sender_name?: string;
  receiver_name?: string;
};

type ChatProps = {
  receiverId: string;
  receiverName: string;
  venueId?: string;
  venueName?: string;
};

const DirectChat = ({ receiverId, receiverName, venueId, venueName }: ChatProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    if (!user || !receiverId) return;
    
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        console.log('Loading messages between', user.id, 'and', receiverId);
        
        // Call the get_conversation function
        const { data, error } = await supabase
          .rpc('get_conversation', {
            current_user_id: user.id,
            other_user_id: receiverId
          });
          
        if (error) {
          console.error('Error from get_conversation:', error);
          throw error;
        }
        
        if (data) {
          console.log('Conversation data received:', data.length, 'messages');
          setMessages(data as Message[]);
          
          // Mark messages as read
          const unreadMessages = data.filter(msg => !msg.read && msg.receiver_id === user.id);
          console.log('Number of unread messages:', unreadMessages.length);
          
          if (unreadMessages.length > 0) {
            await Promise.all(unreadMessages.map(msg => 
              supabase
                .from('messages')
                .update({ read: true })
                .eq('id', msg.id)
            ));
            
            // Also send a notification that a message has been read
            await updateUnreadNotifications();
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Update unread notifications counter
    const updateUnreadNotifications = async () => {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('type', 'message')
          .eq('read', false);
      } catch (error) {
        console.error('Error updating notification status:', error);
      }
    };
    
    // Load messages immediately
    loadMessages();
    
    // Set up real-time subscription for messages
    console.log('Setting up real-time subscription for messages...');
    
    // This channel listens for new messages from the other user
    const incomingChannel = supabase
      .channel('incoming_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `sender_id=eq.${receiverId},receiver_id=eq.${user.id}` 
        }, 
        (payload) => {
          console.log('Received new message via subscription:', payload);
          const newMsg = payload.new as Message;
          
          // Add to messages if not already there
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
          
          // Mark as read immediately
          supabase
            .from('messages')
            .update({ read: true })
            .eq('id', newMsg.id);
        }
      )
      .subscribe();
    
    // This channel listens for messages sent by the current user
    const outgoingChannel = supabase
      .channel('outgoing_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${receiverId}` 
        }, 
        (payload) => {
          console.log('Received outgoing message via subscription:', payload);
          const newMsg = payload.new as Message;
          
          // Add to messages if not already there
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();
    
    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up message subscriptions');
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
    };
  }, [user, receiverId, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile) return;
    
    setIsSending(true);
    try {
      console.log('Sending message to:', receiverId);
      
      const messageData = {
        content: newMessage,
        sender_id: user.id,
        receiver_id: receiverId,
        sender_name: `${profile.first_name} ${profile.last_name}`,
        receiver_name: receiverName,
        venue_id: venueId,
        venue_name: venueName,
        read: false
      };
      
      const { error } = await supabase
        .from('messages')
        .insert(messageData);
        
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      // Also create a notification for the recipient
      await supabase.from('notifications').insert({
        user_id: receiverId,
        title: 'New Message',
        message: `${profile.first_name} ${profile.last_name} sent you a message: "${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}"`,
        type: 'message',
        read: false,
        link: `/messages/${user.id}`,
        data: {
          sender_id: user.id,
          venue_id: venueId
        }
      });
      
      console.log('Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <Card className="glass-card border-white/10 h-[400px] flex items-center justify-center">
        <CardContent>
          <p className="text-center text-findvenue-text-muted">Please log in to chat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10 h-[400px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src="" />
            <AvatarFallback>{receiverName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span>{receiverName}</span>
        </CardTitle>
        {venueName && (
          <Badge className="bg-findvenue/80" variant="secondary">
            {venueName}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-findvenue" />
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <p className="text-center text-findvenue-text-muted py-4">
                No messages yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.sender_id === user.id
                          ? 'bg-findvenue text-white rounded-br-none'
                          : 'bg-findvenue-surface text-findvenue-text rounded-bl-none'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        )}

        <form onSubmit={sendMessage} className="p-2 border-t border-white/10 mt-auto">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="bg-findvenue-surface/50"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isSending || !newMessage.trim()} 
              className="bg-findvenue hover:bg-findvenue-dark"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DirectChat;
