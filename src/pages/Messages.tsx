import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Message as MessageType, ChatContact } from '@/components/chat/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Messages = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);
  
  useEffect(() => {
    if (user && userId) {
      const fetchMessages = async () => {
        setIsLoading(true);
        
        try {
          const params = new URLSearchParams(window.location.search);
          const venueId = params.get('venueId');
          const venueName = params.get('venueName');
          const bookingId = params.get('bookingId');
          
          const { data: currentUserProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          setUserProfile(currentUserProfile);
          
          const { data: otherUser } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          setOtherUserProfile(otherUser);
          
          const { data, error } = await supabase
            .rpc('get_conversation', {
              current_user_id: user.id,
              other_user_id: userId
            });
            
          if (error) throw error;
          
          const formattedMessages = data.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            created_at: msg.created_at,
            read: msg.read,
            sender_name: msg.sender_name,
            receiver_name: msg.receiver_name,
            venue_id: msg.venue_id,
            venue_name: msg.venue_name,
            booking_id: msg.booking_id
          }));
          
          setMessages(formattedMessages || []);
          
          if (formattedMessages && formattedMessages.length > 0) {
            const unreadMessages = formattedMessages.filter(
              msg => msg.receiver_id === user.id && !msg.read
            );
            
            if (unreadMessages.length > 0) {
              const unreadIds = unreadMessages.map(msg => msg.id);
              
              await supabase
                .from('messages')
                .update({ read: true })
                .in('id', unreadIds);
            }
          }
          
          if (venueId && venueName && messages.length === 0) {
            const senderName = currentUserProfile 
              ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}`
              : 'Customer';
              
            const initialMessage = {
              sender_id: user.id,
              receiver_id: userId,
              sender_name: senderName,
              receiver_name: otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Venue Owner',
              content: `Hi, I'm interested in ${venueName}.`,
              venue_id: venueId,
              venue_name: venueName,
              booking_id: bookingId || undefined
            };
            
            if (bookingId) {
              initialMessage.content = `Hi, I have a question about my booking at ${venueName}.`;
              initialMessage.booking_id = bookingId;
            }
            
            const { data: newMsg, error: sendError } = await supabase
              .from('messages')
              .insert(initialMessage)
              .select()
              .single();
              
            if (!sendError && newMsg) {
              setMessages([newMsg]);
            }
          }
          
          if (otherUser) {
            const contactInfo: ChatContact = {
              id: otherUser.id,
              name: `${otherUser.first_name} ${otherUser.last_name}`,
              image: otherUser.profile_image || undefined,
              role: otherUser.user_role === 'venue_owner' ? 'venue-owner' : 'customer'
            };
            
            if (venueId && venueName) {
              contactInfo.venue_id = venueId;
              contactInfo.venue_name = venueName;
            }
            
            setSelectedContact(contactInfo);
          }
          
        } catch (error) {
          console.error('Error fetching messages:', error);
          toast({
            title: 'Error',
            description: 'Failed to load messages. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchMessages();
      
      const subscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, (payload) => {
          const newMsg = payload.new as MessageType;
          if (newMsg.sender_id === userId || newMsg.receiver_id === userId) {
            setMessages(prev => [...prev, newMsg]);
            
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        })
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, userId, toast]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_message_contacts', {
        current_user_id: user.id
      });
      
      if (error) throw error;
      
      const formattedContacts: ChatContact[] = (data || []).map((contact: any) => ({
        id: contact.user_id,
        name: contact.full_name,
        status: contact.unread_count > 0 ? `${contact.unread_count} unread` : undefined,
        role: contact.role === 'venue_owner' ? 'venue-owner' : 'customer',
        venue_id: contact.venue_id,
        venue_name: contact.venue_name
      }));
      
      setContacts(formattedContacts);
      
      if (userId && !selectedContact) {
        const found = formattedContacts.find(c => c.id === userId);
        if (found) setSelectedContact(found);
      }
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !userId || isSending) return;
    
    setIsSending(true);
    
    try {
      const messageData = {
        sender_id: user.id,
        receiver_id: userId,
        content: newMessage.trim(),
        sender_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : undefined,
        receiver_name: otherUserProfile ? `${otherUserProfile.first_name} ${otherUserProfile.last_name}` : undefined,
        venue_id: selectedContact?.venue_id,
        venue_name: selectedContact?.venue_name
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
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
  
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'h:mm a');
    } catch (e) {
      return '';
    }
  };
  
  const formatMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      return '';
    }
  };
  
  const groupMessagesByDate = () => {
    const groups: { [date: string]: MessageType[] } = {};
    
    messages.forEach(message => {
      const date = formatMessageDate(message.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };
  
  const messageGroups = groupMessagesByDate();
  
  const selectContact = (contact: ChatContact) => {
    navigate(`/messages/${contact.id}`);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
            <p className="text-findvenue-text-muted">
              You need to be signed in to view messages.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-findvenue-text-muted mb-8">
            Chat with venue owners and customers
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="glass-card border-white/10 h-[calc(100vh-240px)] flex flex-col">
                <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">Conversations</h2>
                  
                  <div className="overflow-y-auto flex-1 pr-2 space-y-2">
                    {contacts.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-findvenue-text-muted">No conversations yet</p>
                      </div>
                    ) : (
                      contacts.map(contact => (
                        <div 
                          key={contact.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedContact?.id === contact.id 
                              ? 'bg-findvenue/20 border border-findvenue/30' 
                              : 'hover:bg-findvenue-surface/30'
                          }`}
                          onClick={() => selectContact(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={contact.image} />
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{contact.name}</p>
                                {contact.status && (
                                  <Badge variant="outline" className="bg-findvenue/20 text-findvenue border-findvenue/30">
                                    {contact.status}
                                  </Badge>
                                )}
                              </div>
                              {contact.role && (
                                <p className="text-xs text-findvenue-text-muted">
                                  {contact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                                </p>
                              )}
                              {contact.venue_name && (
                                <p className="text-xs text-findvenue truncate">
                                  {contact.venue_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card className="glass-card border-white/10 h-[calc(100vh-240px)] flex flex-col">
                {!userId ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-6">
                      <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                      <p className="text-findvenue-text-muted">
                        Choose a contact from the list to start chatting
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-white/10 flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="md:hidden"
                        onClick={() => navigate('/messages')}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      
                      <Avatar>
                        <AvatarImage src={otherUserProfile?.profile_image} />
                        <AvatarFallback>
                          {getInitials(selectedContact?.name || '')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {selectedContact?.name || 'Chat'}
                        </h3>
                        {selectedContact?.role && (
                          <p className="text-xs text-findvenue-text-muted">
                            {selectedContact.role === 'venue-owner' ? 'Venue Owner' : 'Customer'}
                          </p>
                        )}
                      </div>
                      
                      {selectedContact?.venue_name && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-findvenue/10 border-findvenue/20">
                                {selectedContact.venue_name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Conversation about this venue</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    <div 
                      className="flex-1 overflow-y-auto p-4 space-y-6"
                      ref={messageContainerRef}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            <p className="text-findvenue-text-muted">Loading messages...</p>
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center p-6">
                            <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                            <p className="text-findvenue-text-muted">
                              Send a message to start the conversation
                            </p>
                          </div>
                        </div>
                      ) : (
                        Object.entries(messageGroups).map(([date, msgs]) => (
                          <div key={date} className="space-y-4">
                            <div className="flex items-center justify-center">
                              <div className="bg-findvenue-surface/30 px-3 py-1 rounded-full text-xs text-findvenue-text-muted">
                                {date}
                              </div>
                            </div>
                            
                            {msgs.map((message) => {
                              const isCurrentUser = message.sender_id === user.id;
                              
                              return (
                                <div 
                                  key={message.id}
                                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                    <div 
                                      className={`p-3 rounded-lg ${
                                        isCurrentUser 
                                          ? 'bg-findvenue text-white rounded-br-none' 
                                          : 'bg-findvenue-surface/30 rounded-bl-none'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                    </div>
                                    <div className={`mt-1 text-xs text-findvenue-text-muted ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                      {formatMessageTime(message.created_at)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="p-4 border-t border-white/10">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1"
                          disabled={isSending}
                        />
                        <Button 
                          type="submit" 
                          disabled={!newMessage.trim() || isSending}
                          className="bg-findvenue hover:bg-findvenue-dark"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
