import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_name?: string;
  receiver_name?: string;
  venue_id?: string;
  venue_name?: string;
};

const DirectChat = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [contactName, setContactName] = useState<string>('Contact');
  const [contactRole, setContactRole] = useState<string>('');
  const [contactImage, setContactImage] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contactId || contactId === 'undefined') {
      console.error('Invalid contactId:', contactId);
      setHasError(true);
      setErrorMessage('Invalid contact ID. Please go back to messages and select a valid contact.');
      setIsLoading(false);
    } else {
      setHasError(false);
      setErrorMessage('');
    }
  }, [contactId]);

  useEffect(() => {
    if (!user || !contactId || hasError || contactId === 'undefined') return;
    
    const handleMessages = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching messages for contact:", contactId);
        
        const { data: contactData, error: contactError } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, user_role, profile_image')
          .eq('id', contactId)
          .single();
          
        if (contactError) {
          console.error('Error fetching contact data:', contactError);
          setHasError(true);
          setErrorMessage('Could not find the selected contact. They may no longer exist or you may not have permission to view this conversation.');
          throw contactError;
        }
        
        if (contactData) {
          setContactName(`${contactData.first_name} ${contactData.last_name}`);
          setContactRole(contactData.user_role);
          setContactImage(contactData.profile_image);
          console.log("Contact data fetched:", contactData);
        } else {
          setHasError(true);
          setErrorMessage('Contact not found. Please try again or select a different contact.');
          throw new Error('Contact not found');
        }
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${contactId},receiver_id.eq.${contactId}`)
          .order('created_at', { ascending: true });
            
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          throw messagesError;
        }
        
        const relevantMessages = messagesData ? messagesData.filter(msg => 
          (msg.sender_id === user.id && msg.receiver_id === contactId) || 
          (msg.sender_id === contactId && msg.receiver_id === user.id)
        ) : [];
        
        if (relevantMessages && relevantMessages.length > 0) {
          console.log("Fetched messages:", relevantMessages.length);
          setMessages(relevantMessages);
          
          const venueMessage = relevantMessages.find(msg => msg.venue_id && msg.venue_name);
          if (venueMessage) {
            setVenueId(venueMessage.venue_id || null);
            setVenueName(venueMessage.venue_name || null);
          }
          
          const unreadMessageIds = relevantMessages
            .filter(msg => !msg.read && msg.sender_id === contactId && msg.receiver_id === user.id)
            .map(msg => msg.id);
            
          if (unreadMessageIds.length > 0) {
            console.log("Marking messages as read:", unreadMessageIds.length);
            await supabase
              .from('messages')
              .update({ read: true })
              .in('id', unreadMessageIds);
          }
        } else {
          console.log("No messages found between users");
          setMessages([]);
          
          if (profile) {
            sendWelcomeMessage(contactData.first_name);
          }
        }
      } catch (error: any) {
        console.error('Error loading messages:', error);
        setErrorMessage('Failed to load messages. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    handleMessages();
  }, [contactId, user, hasError, profile]);

  const sendWelcomeMessage = async (contactFirstName: string) => {
    if (!user || !profile || !contactId) return;
    
    try {
      const welcomeMessage = `Hello ${contactFirstName}! I'm interested in discussing more. Can you please provide more information?`;
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: contactId,
          content: welcomeMessage,
          sender_name: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
          receiver_name: contactName || undefined,
          venue_id: venueId || undefined,
          venue_name: venueName || undefined,
          read: false
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error sending welcome message:", error);
        return;
      }
      
      if (data) {
        console.log("Welcome message sent:", data);
        setMessages(prev => [...prev, data]);
      }
      
      await supabase
        .from('notifications')
        .insert({
          user_id: contactId,
          title: 'New Message',
          message: `${profile?.first_name || 'Someone'} started a conversation with you`,
          type: 'message',
          read: false,
          link: `/messages/${user.id}`,
          data: {
            sender_id: user.id,
            venue_id: venueId || null
          }
        });
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }
  };

  useEffect(() => {
    if (!user || !contactId || hasError || contactId === 'undefined') return;
    
    console.log("Setting up realtime subscription for chat between", user.id, "and", contactId);
    
    const channel = supabase
      .channel('direct_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${contactId},receiver_id=eq.${user.id}`
      }, async (payload) => {
        console.log('New message received:', payload);
        
        const newMessage = payload.new as Message;
        
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('id', newMessage.id);
          
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();
      
    return () => {
      console.log("Removing realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [user, contactId, hasError]);

  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !contactId || hasError || contactId === 'undefined') {
      console.log("Cannot send message:", {
        hasMessage: !!newMessage.trim(),
        hasUser: !!user,
        hasContactId: !!contactId,
        hasError
      });
      return;
    }
    
    try {
      setIsSending(true);
      console.log("Sending message to", contactId);
      
      const messageData = {
        sender_id: user.id,
        receiver_id: contactId,
        content: newMessage.trim(),
        sender_name: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
        receiver_name: contactName || undefined,
        venue_id: venueId || undefined,
        venue_name: venueName || undefined,
        read: false
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }
      
      if (data) {
        console.log("Message sent successfully:", data);
        setMessages(prev => [...prev, data]);
      }
      
      await supabase
        .from('notifications')
        .insert({
          user_id: contactId,
          title: 'New Message',
          message: `${profile?.first_name || 'Someone'} sent you a message`,
          type: 'message',
          read: false,
          link: `/messages/${user.id}`,
          data: {
            sender_id: user.id,
            venue_id: venueId || null
          }
        });
      
      setNewMessage('');
    } catch (error: any) {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  if (!user) {
    return (
      <Card className="glass-card border-white/10 h-[600px] flex items-center justify-center">
        <CardContent>
          <p className="text-center text-findvenue-text-muted">Please log in to chat</p>
          <div className="mt-4 text-center">
            <Button onClick={() => navigate('/login')} className="bg-findvenue hover:bg-findvenue-dark">
              Log In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="glass-card border-white/10 h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage || 'There was an error loading this conversation. The contact may not exist.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/messages')} className="bg-findvenue hover:bg-findvenue-dark">
            Back to Messages
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10 h-[600px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-1 p-0 h-8 w-8" 
            onClick={() => navigate('/messages')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-6 w-6">
            <AvatarImage src={contactImage || `https://api.dicebear.com/7.x/initials/svg?seed=${contactName}`} />
            <AvatarFallback className="bg-findvenue-surface text-findvenue">
              {contactName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <span>{contactName || 'Chat'}</span>
          {contactRole && (
            <Badge variant="outline" className="ml-2 text-xs">
              {contactRole === 'venue-owner' ? 'Venue Owner' : 'Customer'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-findvenue" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <p className="text-center text-findvenue-text-muted py-4">
                No messages yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-4">
                {venueName && (
                  <div className="text-center mb-4">
                    <Badge variant="outline" className="bg-findvenue/10 text-findvenue">
                      Conversation about {venueName}
                    </Badge>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 ${
                        message.sender_id === user.id
                          ? 'bg-findvenue text-white'
                          : 'bg-findvenue-card-bg border border-findvenue-border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user.id ? 'text-white/70' : 'text-findvenue-text-muted'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        <form onSubmit={sendMessage} className="p-4 border-t border-white/10 mt-auto">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending || isLoading || hasError}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) sendMessage(e);
                }
              }}
            />
            <Button type="submit" disabled={isSending || isLoading || hasError || !newMessage.trim()}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default DirectChat;
