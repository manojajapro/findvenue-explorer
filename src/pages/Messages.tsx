import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Send, ArrowLeft, Clock, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Define types for messages and conversations
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  attachment_url?: string;
};

type Conversation = {
  id: string;
  participants: string[];
  created_at: string;
  updated_at: string;
  last_message?: string;
  venue_id?: string;
  venue_name?: string;
};

type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  conversationId?: string;
};

const DirectChat = ({ receiverId, receiverName, venueId, venueName }: {
  receiverId: string;
  receiverName: string;
  venueId?: string;
  venueName?: string;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user && receiverId) {
      findOrCreateConversation();
    }
  }, [user, receiverId]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      const subscription = subscribeToMessages();
      markMessagesAsRead();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findOrCreateConversation = async () => {
    if (!user || !receiverId) return;
    
    try {
      setIsLoading(true);
      
      // First, check if a conversation already exists between these users
      const { data: existingConversations, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [user.id, receiverId]);
      
      if (fetchError) throw fetchError;
      
      let conversation: Conversation | null = null;
      
      if (existingConversations && existingConversations.length > 0) {
        // Use the existing conversation
        conversation = existingConversations[0];
        console.log('Found existing conversation:', conversation);
      } else {
        // Create a new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            participants: [user.id, receiverId],
            venue_id: venueId,
            venue_name: venueName
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        conversation = newConversation;
        console.log('Created new conversation:', conversation);
      }
      
      if (conversation) {
        setConversationId(conversation.id);
      }
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!conversationId) {
      return { unsubscribe: () => {} };
    }
    
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        
        // Only add the message if it's not already in our list
        setMessages(prev => {
          if (!prev.some(msg => msg.id === newMessage.id)) {
            return [...prev, newMessage];
          }
          return prev;
        });
        
        // Mark message as read if it's from the other person
        if (newMessage.sender_id !== user?.id) {
          markMessageAsRead(newMessage.id);
        }
      })
      .subscribe();
  };

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_id', receiverId)
        .eq('read', false);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !conversationId || (!newMessage.trim() && !selectedFile)) return;
    
    try {
      setIsSending(true);
      
      let attachmentUrl = null;
      
      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `message-attachments/${conversationId}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
          
        attachmentUrl = urlData.publicUrl;
        setIsUploading(false);
      }
      
      // Send message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: newMessage.trim() || (selectedFile ? 'Sent an attachment' : ''),
          attachment_url: attachmentUrl,
          read: false
        });
      
      if (error) throw error;
      
      // Update conversation's last_message and updated_at
      await supabase
        .from('conversations')
        .update({ 
          last_message: newMessage.trim() || 'Sent an attachment',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      // Clear input
      setNewMessage('');
      setSelectedFile(null);
      
      // Send notification to receiver
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          title: 'New Message',
          message: `${user.user_metadata?.first_name || 'Someone'} sent you a message${venueName ? ` about ${venueName}` : ''}`,
          type: 'message',
          read: false,
          link: `/messages/${user.id}`,
          data: {
            conversation_id: conversationId,
            sender_id: user.id
          }
        });
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 5MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <CardHeader className="px-4 py-3 flex flex-row items-center border-b border-white/10">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src="" />
          <AvatarFallback className="bg-findvenue-surface text-findvenue">
            {receiverName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold">{receiverName}</h3>
          {venueName && (
            <p className="text-sm text-findvenue-text-muted">
              Re: {venueName}
            </p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${i % 2 === 0 ? 'bg-findvenue/20' : 'bg-findvenue-surface/50'} rounded-lg p-2`}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-3 w-16 mt-2 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-findvenue-text-muted">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender_id === user?.id 
                    ? 'bg-findvenue text-white' 
                    : 'bg-findvenue-surface/50'
                }`}
              >
                {message.content && (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
                
                {message.attachment_url && (
                  <div className="mt-2">
                    {message.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                      <img 
                        src={message.attachment_url} 
                        alt="Attachment" 
                        className="max-w-full rounded-md max-h-60 object-contain"
                        onClick={() => window.open(message.attachment_url, '_blank')}
                      />
                    ) : (
                      <a 
                        href={message.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-2 bg-black/20 rounded-md hover:bg-black/30 transition-colors"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm">View Attachment</span>
                      </a>
                    )}
                  </div>
                )}
                
                <div className={`flex items-center justify-end mt-1 text-xs ${
                  message.sender_id === user?.id ? 'text-white/70' : 'text-findvenue-text-muted'
                }`}>
                  <span>{formatMessageTime(message.created_at)}</span>
                  {message.sender_id === user?.id && (
                    <span className="ml-1">
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <div className="p-4 border-t border-white/10">
        {selectedFile && (
          <div className="mb-2 p-2 bg-findvenue-surface/30 rounded flex items-center justify-between">
            <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedFile(null)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleFileSelect}
            disabled={isSending || isUploading}
            className="shrink-0"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || isUploading}
            className="flex-1"
          />
          
          <Button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading}
            className="bg-findvenue hover:bg-findvenue-dark shrink-0"
          >
            {isSending || isUploading ? (
              <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setSelectedContact(contact);
      } else {
        // If we have a contactId but no matching contact, we need to fetch user info
        fetchUserInfo(contactId);
      }
    } else if (contacts.length > 0 && !contactId) {
      // If no contactId is provided, select the first contact
      setSelectedContact(contacts[0]);
      navigate(`/messages/${contacts[0].id}`, { replace: true });
    }
  }, [contactId, contacts]);
  
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch all conversations where the current user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [user.id])
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setConversations(data);
        
        // Extract unique contact IDs from conversations
        const contactIds = new Set<string>();
        data.forEach(conv => {
          conv.participants.forEach(participantId => {
            if (participantId !== user.id) {
              contactIds.add(participantId);
            }
          });
        });
        
        // Fetch user profiles for all contacts
        if (contactIds.size > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, profile_image')
            .in('id', Array.from(contactIds));
          
          if (profilesError) throw profilesError;
          
          // Count unread messages for each conversation
          const contactsWithUnread = await Promise.all(
            Array.from(contactIds).map(async (contactId) => {
              const conversation = data.find(conv => 
                conv.participants.includes(contactId) && conv.participants.includes(user.id)
              );
              
              let unreadCount = 0;
              
              if (conversation) {
                const { count, error: countError } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('conversation_id', conversation.id)
                  .eq('sender_id', contactId)
                  .eq('read', false);
                
                if (!countError && count !== null) {
                  unreadCount = count;
                }
              }
              
              const profile = profiles?.find(p => p.id === contactId);
              
              return {
                id: contactId,
                name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User',
                avatar: profile?.profile_image,
                lastMessage: conversation?.last_message || '',
                lastMessageTime: conversation?.updated_at,
                unreadCount,
                conversationId: conversation?.id
              };
            })
          );
          
          // Sort contacts by last message time
          const sortedContacts = contactsWithUnread.sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
          });
          
          setContacts(sortedContacts);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserInfo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_image')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const newContact = {
          id: data.id,
          name: `${data.first_name} ${data.last_name}`,
          avatar: data.profile_image,
          unreadCount: 0
        };
        
        setContacts(prev => {
          if (!prev.some(c => c.id === newContact.id)) {
            return [...prev, newContact];
          }
          return prev;
        });
        
        setSelectedContact(newContact);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user information',
        variant: 'destructive'
      });
    }
  };
  
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    navigate(`/messages/${contact.id}`);
  };
  
  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return format(date, 'EEEE');
    } else {
      return format(date, 'MMM d');
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Please log in to access messages</p>
            <Button 
              className="mt-4 w-full bg-findvenue hover:bg-findvenue-dark"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Find the selected conversation to get venue info
  const selectedConversation = selectedContact?.conversationId 
    ? conversations.find(c => c.id === selectedContact.conversationId)
    : null;
  
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="p-0 flex items-center text-findvenue-text-muted hover:text-findvenue"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mt-2">Messages</h1>
        </div>
        
        <Card className="glass-card border-white/10 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-12rem)]">
            <div className="border-r border-white/10 md:col-span-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/10">
                <h2 className="font-semibold">Conversations</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-4 text-center text-findvenue-text-muted">
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  <div>
                    {contacts.map((contact) => (
                      <div 
                        key={contact.id}
                        className={`flex items-center p-4 cursor-pointer hover:bg-findvenue-surface/30 transition-colors ${
                          selectedContact?.id === contact.id ? 'bg-findvenue-surface/50' : ''
                        }`}
                        onClick={() => handleContactSelect(contact)}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={contact.avatar || ''} />
                          <AvatarFallback className="bg-findvenue-surface text-findvenue">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium truncate">{contact.name}</h3>
                            {contact.lastMessageTime && (
                              <span className="text-xs text-findvenue-text-muted">
                                {formatLastMessageTime(contact.lastMessageTime)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-findvenue-text-muted truncate">
                              {contact.lastMessage || 'No messages yet'}
                            </p>
                            
                            {contact.unreadCount > 0 && (
                              <span className="ml-2 bg-findvenue text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                                {contact.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2 flex flex-col">
              {selectedContact ? (
                <DirectChat 
                  receiverId={selectedContact.id} 
                  receiverName={selectedContact.name}
                  venueId={selectedConversation?.venue_id}
                  venueName={selectedConversation?.venue_name}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-4">
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-findvenue-text-muted">
                      Choose a contact from the list to start chatting
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Messages;
