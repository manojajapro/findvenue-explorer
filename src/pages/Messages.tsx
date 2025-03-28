
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DirectChat from '@/components/chat/DirectChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  conversationId?: string;
};

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  useEffect(() => {
    if (user) {
      fetchContacts();
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
  
  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching conversations for user:", user.id);
      
      // Fetch all conversations where the current user is a participant
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [user.id])
        .order('updated_at', { ascending: false });
      
      if (convError) {
        console.error("Error fetching conversations:", convError);
        toast({
          title: 'Error',
          description: 'Failed to load conversations',
          variant: 'destructive'
        });
        return;
      }
      
      console.log("Fetched conversations:", conversations);
      
      if (!conversations || conversations.length === 0) {
        setContacts([]);
        setIsLoading(false);
        return;
      }
      
      // Extract unique contact IDs from conversations
      const contactIds = new Set<string>();
      conversations.forEach(conv => {
        conv.participants.forEach(participantId => {
          if (participantId !== user.id) {
            contactIds.add(participantId);
          }
        });
      });
      
      console.log("Extracted contact IDs:", [...contactIds]);
      
      // Fetch user profiles for all contacts
      if (contactIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, profile_image')
          .in('id', Array.from(contactIds));
        
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          throw profilesError;
        }
        
        console.log("Fetched profiles:", profiles);
        
        // Count unread messages for each conversation
        const contactsWithUnread = await Promise.all(
          Array.from(contactIds).map(async (contactId) => {
            const conversation = conversations.find(conv => 
              conv.participants.includes(contactId) && conv.participants.includes(user.id)
            );
            
            let unreadCount = 0;
            
            if (conversation) {
              const { count, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', contactId)
                .eq('receiver_id', user.id)
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
        
        console.log("Processed contacts:", sortedContacts);
        setContacts(sortedContacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserInfo = async (userId: string) => {
    try {
      console.log("Fetching user info for:", userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_image')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching user info:", error);
        throw error;
      }
      
      if (data) {
        console.log("Fetched user info:", data);
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
            <div className="mt-4 text-center">
              <Button 
                className="bg-findvenue hover:bg-findvenue-dark"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
                    <p className="text-sm mt-2">When you message a venue owner, your conversations will appear here.</p>
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
              {contactId ? (
                <DirectChat />
              ) : selectedContact ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-4">
                    <h3 className="text-lg font-medium mb-2">Loading conversation...</h3>
                  </div>
                </div>
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
