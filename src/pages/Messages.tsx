import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DirectChat from '@/components/chat/DirectChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  venueId?: string;
  venueData?: {
    id: string;
    name: string;
  };
};

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
        fetchUserInfo(contactId);
      }
    } else if (contacts.length > 0 && !contactId) {
      setSelectedContact(contacts[0]);
      navigate(`/messages/${contacts[0].id}`, { replace: true });
    }
  }, [contactId, contacts]);
  
  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching message contacts for user:", user.id);
      
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        setError("Failed to load message history. Please try again later.");
        setIsLoading(false);
        return;
      }
      
      if (!messages || messages.length === 0) {
        console.log("No messages found");
        setContacts([]);
        setIsLoading(false);
        return;
      }
      
      console.log("Fetched messages:", messages.length);
      
      const contactIds = new Set<string>();
      messages.forEach(msg => {
        if (msg.sender_id === user.id) {
          contactIds.add(msg.receiver_id);
        } else if (msg.receiver_id === user.id) {
          contactIds.add(msg.sender_id);
        }
      });
      
      console.log("Extracted contact IDs:", [...contactIds]);
      
      if (contactIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, profile_image, user_role')
          .in('id', Array.from(contactIds));
        
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          throw profilesError;
        }
        
        console.log("Fetched profiles:", profiles?.length);
        
        const contactsData: Contact[] = [];
        
        for (const contactId of contactIds) {
          const contactMessages = messages.filter(msg => 
            (msg.sender_id === user.id && msg.receiver_id === contactId) || 
            (msg.sender_id === contactId && msg.receiver_id === user.id)
          );
          
          if (contactMessages.length > 0) {
            contactMessages.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            
            const lastMessage = contactMessages[0];
            
            const unreadCount = contactMessages.filter(msg => 
              msg.sender_id === contactId && 
              msg.receiver_id === user.id && 
              !msg.read
            ).length;
            
            const profile = profiles?.find(p => p.id === contactId);
            
            // Find venue info if it exists
            const messageWithVenue = contactMessages.find(msg => msg.venue_id && msg.venue_name);
            const venueData = messageWithVenue ? {
              id: messageWithVenue.venue_id as string,
              name: messageWithVenue.venue_name as string
            } : undefined;
            
            contactsData.push({
              id: contactId,
              name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User',
              avatar: profile?.profile_image,
              lastMessage: lastMessage.content,
              lastMessageTime: lastMessage.created_at,
              unreadCount,
              venueId: messageWithVenue?.venue_id,
              venueData
            });
          }
        }
        
        contactsData.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
        
        console.log("Processed contacts:", contactsData);
        setContacts(contactsData);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Failed to load contacts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserInfo = async (userId: string) => {
    if (!userId) return;
    
    try {
      console.log("Fetching user info for:", userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_image, user_role')
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
    <div className="h-[calc(100vh-64px)] overflow-hidden">
      <div className="container h-full mx-auto px-4 flex flex-col py-6">
        <div className="mb-4 flex-shrink-0">
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
        
        {error ? (
          <Card className="flex-1 border-white/10 overflow-hidden bg-findvenue-surface/5">
            <CardContent className="p-6">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center mt-4">
                <Button onClick={() => { setError(null); fetchContacts(); }}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 border-white/10 overflow-hidden bg-findvenue-surface/5">
            <div className="h-full grid grid-cols-1 md:grid-cols-3">
              <div className="border-r border-white/10 md:col-span-1 overflow-hidden flex flex-col bg-findvenue-surface/10">
                <div className="p-4 border-b border-white/10 bg-findvenue-surface/20">
                  <h2 className="font-semibold text-lg">Conversations</h2>
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
                    <div className="p-8 text-center text-findvenue-text-muted">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium mb-2">No conversations yet</p>
                      <p className="text-sm">When you message a venue owner, your conversations will appear here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {contacts.map((contact) => (
                        <div 
                          key={contact.id}
                          className={`flex items-center p-4 cursor-pointer transition-colors
                            ${selectedContact?.id === contact.id 
                              ? 'bg-findvenue-surface/30' 
                              : 'hover:bg-findvenue-surface/20'}`}
                          onClick={() => handleContactSelect(contact)}
                        >
                          <Avatar className="h-12 w-12 mr-3 border-2 border-white/10">
                            <AvatarImage src={contact.avatar || ''} />
                            <AvatarFallback className="bg-findvenue text-white font-medium">
                              {contact.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <h3 className="font-medium truncate text-white">
                                {contact.name}
                              </h3>
                              {contact.lastMessageTime && (
                                <span className="text-xs text-findvenue-text-muted ml-2">
                                  {formatLastMessageTime(contact.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-findvenue-text-muted truncate">
                                {contact.lastMessage || 'No messages yet'}
                              </p>
                              
                              {contact.unreadCount > 0 && (
                                <span className="ml-2 bg-findvenue text-white text-xs font-medium rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
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
              
              <div className="md:col-span-2 flex flex-col h-full bg-findvenue-surface/5 overflow-hidden">
                {contactId && selectedContact ? (
                  <DirectChat key={contactId} />
                ) : selectedContact ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-findvenue mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Loading conversation...</h3>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md mx-auto">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-findvenue opacity-50" />
                      <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                      <p className="text-findvenue-text-muted">
                        Choose a contact from the list to start chatting
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Messages;
