
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DirectChat from '@/components/chat/DirectChat';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type ContactType = {
  user_id: string;
  full_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  venue_id?: string;
  venue_name?: string;
  role: string;
};

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { contactId } = useParams();
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
  
  // Fetch contacts
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchContacts = async () => {
      setLoading(true);
      try {
        console.log('Fetching contacts for user:', user.id);
        const { data, error } = await supabase
          .rpc('get_message_contacts', {
            current_user_id: user.id
          });
        
        if (error) {
          console.error('Error fetching contacts:', error);
          throw error;
        }
        
        console.log('Fetched contacts:', data);
        
        if (data) {
          setContacts(data as ContactType[]);
          
          // If contactId is provided, select that contact or create a new contact
          if (contactId) {
            console.log('Contact ID from URL:', contactId);
            const contact = data.find(c => c.user_id === contactId);
            if (contact) {
              console.log('Found existing contact:', contact);
              setSelectedContact(contact);
            } else {
              console.log('No existing contact found, fetching user profile');
              // Fetch user profile for the contactId to create a new contact
              const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('first_name, last_name, user_role')
                .eq('id', contactId)
                .single();
                
              if (profileError) {
                console.error('Error fetching profile:', profileError);
              } else if (profileData) {
                console.log('Created new contact from profile:', profileData);
                const newContact: ContactType = {
                  user_id: contactId,
                  full_name: `${profileData.first_name} ${profileData.last_name}`,
                  last_message: 'No messages yet',
                  last_message_time: new Date().toISOString(),
                  unread_count: 0,
                  role: profileData.user_role
                };
                setSelectedContact(newContact);
              }
            }
          } else if (data.length > 0) {
            // Select first contact by default if no contactId provided
            console.log('No contact ID, selecting first contact');
            setSelectedContact(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
    
    // Set up real-time subscription for any new messages
    // This will trigger a refresh of the contacts list when new messages arrive
    const channel = supabase
      .channel('any_messages_updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`,
          or: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Message change detected, refreshing contacts:', payload);
          fetchContacts();
        }
      )
      .subscribe();
      
    // Also listen for any new messages where user is sender or receiver
    const incomingChannel = supabase
      .channel('messages_user_related')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New message received, refreshing contacts:', payload);
          fetchContacts();
        }
      )
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Message sent, refreshing contacts:', payload);
          fetchContacts();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(incomingChannel);
    };
  }, [user, navigate, contactId]);
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        
        {loading ? (
          <div className="flex justify-center my-12">
            <Loader2 className="h-8 w-8 animate-spin text-findvenue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Contacts sidebar */}
            <div className="md:col-span-1">
              <Card className="glass-card border-white/10">
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    {contacts.length === 0 ? (
                      <div className="p-6 text-center text-findvenue-text-muted">
                        {contactId ? "Starting a new conversation" : "No conversations yet"}
                      </div>
                    ) : (
                      <div>
                        {contacts.map((contact) => (
                          <div
                            key={contact.user_id}
                            className={`p-4 border-b border-white/5 cursor-pointer hover:bg-findvenue-surface/20 transition-colors ${
                              selectedContact?.user_id === contact.user_id ? 'bg-findvenue-surface/30' : ''
                            }`}
                            onClick={() => setSelectedContact(contact)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src="" />
                                <AvatarFallback>{contact.full_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <p className="font-medium truncate">{contact.full_name}</p>
                                  <span className="text-xs text-findvenue-text-muted">
                                    {formatMessageTime(contact.last_message_time)}
                                  </span>
                                </div>
                                <p className="text-sm text-findvenue-text-muted truncate mt-1">
                                  {contact.last_message}
                                </p>
                                {contact.venue_name && (
                                  <Badge variant="outline" className="mt-1 border-findvenue/30 text-xs">
                                    {contact.venue_name}
                                  </Badge>
                                )}
                              </div>
                              {contact.unread_count > 0 && (
                                <Badge className="bg-findvenue ml-2">{contact.unread_count}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Chat area */}
            <div className="md:col-span-2">
              {selectedContact ? (
                <DirectChat
                  receiverId={selectedContact.user_id}
                  receiverName={selectedContact.full_name}
                  venueId={selectedContact.venue_id}
                  venueName={selectedContact.venue_name}
                />
              ) : (
                <Card className="glass-card border-white/10 h-[400px] flex items-center justify-center">
                  <CardContent>
                    <p className="text-center text-findvenue-text-muted">
                      {contacts.length > 0 
                        ? 'Select a conversation to start chatting' 
                        : 'No conversations yet. Start by contacting a venue owner!'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format message time
function formatMessageTime(timestamp: string): string {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return messageDate.toLocaleDateString([], { weekday: 'short' });
  } else {
    return messageDate.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
}

export default Messages;
