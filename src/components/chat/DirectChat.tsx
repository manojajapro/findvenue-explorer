
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
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Check if contactId is valid
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

  // Load messages
  useEffect(() => {
    if (!user || !contactId || hasError || contactId === 'undefined') return;
    
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        
        // Get contact name
        const { data: contactData, error: contactError } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, user_role')
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
        } else {
          setHasError(true);
          setErrorMessage('Contact not found. Please try again or select a different contact.');
          throw new Error('Contact not found');
        }
        
        // First, check if a conversation exists
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('id, venue_id, venue_name')
          .contains('participants', [user.id, contactId])
          .maybeSingle();
        
        if (conversation) {
          setVenueId(conversation.venue_id);
          setVenueName(conversation.venue_name);
        }
        
        // Get message history
        const { data, error } = await supabase
          .rpc('get_conversation', {
            current_user_id: user.id,
            other_user_id: contactId
          });
          
        if (error) {
          console.error('Error fetching conversation:', error);
          setErrorMessage('Error loading conversation. Please try again later.');
          throw error;
        }
        
        if (data && data.length > 0) {
          setMessages(data);
          
          // Extract venue info from the first message that has it
          if (!venueId) {
            const messageWithVenue = data.find(msg => msg.venue_id);
            if (messageWithVenue) {
              setVenueId(messageWithVenue.venue_id);
              setVenueName(messageWithVenue.venue_name);
            }
          }
          
          // Mark received messages as read
          const unreadMessageIds = data
            .filter(msg => !msg.read && msg.sender_id === contactId)
            .map(msg => msg.id);
            
          if (unreadMessageIds.length > 0) {
            await supabase
              .from('messages')
              .update({ read: true })
              .in('id', unreadMessageIds);
          }
        } else {
          // No existing messages, but create a conversation entry for realtime updates
          if (!conversation) {
            const { error: createError } = await supabase
              .from('conversations')
              .insert({
                participants: [user.id, contactId],
                venue_id: null,
                venue_name: null,
                last_message: null
              })
              .select();
            
            if (createError) {
              console.error('Error creating conversation:', createError);
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading messages:', error);
        setHasError(true);
        if (!errorMessage) {
          setErrorMessage('Failed to load conversation. Please try again.');
        }
        toast({
          title: 'Error',
          description: errorMessage || 'Failed to load conversation. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Set up real-time subscription for new messages
    if (contactId && contactId !== 'undefined') {
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
          
          // Mark message as read
          await supabase
            .from('messages')
            .update({ read: true })
            .eq('id', newMessage.id);
            
          // Add message to state
          setMessages(prev => [...prev, newMessage]);
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, contactId, toast, hasError, errorMessage, venueId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Using a slight delay to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !contactId || hasError || contactId === 'undefined') return;
    
    try {
      setIsSending(true);
      
      // Update conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id, contactId])
        .maybeSingle();
      
      if (conversation) {
        await supabase
          .from('conversations')
          .update({
            last_message: newMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id);
      }
      
      // Send message
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
        
      if (error) throw error;
      
      // Add the new message to the state
      if (data) {
        setMessages(prev => [...prev, data]);
      }
      
      // Clear the input
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
            <AvatarFallback>{contactName?.charAt(0) || '?'}</AvatarFallback>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${contactName}`} />
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
