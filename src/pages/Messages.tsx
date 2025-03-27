
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle } from 'lucide-react';
import DirectChat from '@/components/chat/DirectChat';
import { useToast } from '@/components/ui/use-toast';

type ChatContact = {
  user_id: string;
  full_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  venue_id?: string;
  venue_name?: string;
  role: 'customer' | 'venue-owner';
};

const Messages = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        // Get unique contacts from messages
        const { data, error } = await supabase.rpc('get_message_contacts', {
          current_user_id: user.id
        });
        
        if (error) throw error;
        
        if (data) {
          setContacts(data as ChatContact[]);
          setFilteredContacts(data as ChatContact[]);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load message contacts',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContacts();
    
    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('direct_messages_list')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}` 
        }, 
        () => {
          // Refresh contacts when new message arrives
          fetchContacts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    
    const filtered = contacts.filter(contact => 
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.venue_name && contact.venue_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);
  
  const handleContactSelect = (contact: ChatContact) => {
    setSelectedContact(contact);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <p className="text-center">Please log in to access messages</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card border-white/10 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span>Conversations</span>
              </CardTitle>
              
              <div className="relative mt-3">
                <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-findvenue-text-muted h-4 w-4" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-9 bg-findvenue-surface/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            
            <CardContent className="px-0">
              <Tabs defaultValue="all">
                <TabsList className="grid grid-cols-2 mx-4 mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread
                    {contacts.reduce((count, contact) => count + contact.unread_count, 0) > 0 && (
                      <Badge className="ml-2 bg-findvenue text-white">
                        {contacts.reduce((count, contact) => count + contact.unread_count, 0)}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="m-0">
                  {isLoading ? (
                    <div className="p-4 text-center text-findvenue-text-muted">
                      Loading contacts...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-4 text-center text-findvenue-text-muted">
                      {searchQuery ? 'No contacts match your search' : 'No conversations yet'}
                    </div>
                  ) : (
                    <div className="divide-y divide-findvenue-surface/50">
                      {filteredContacts.map((contact) => (
                        <div
                          key={contact.user_id}
                          className={`px-4 py-3 cursor-pointer hover:bg-findvenue-surface/20 transition-colors ${
                            selectedContact?.user_id === contact.user_id ? 'bg-findvenue-surface/30' : ''
                          }`}
                          onClick={() => handleContactSelect(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src="" />
                              <AvatarFallback>
                                {contact.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="font-medium truncate">{contact.full_name}</p>
                                <span className="text-xs text-findvenue-text-muted whitespace-nowrap ml-2">
                                  {formatMessageTime(contact.last_message_time)}
                                </span>
                              </div>
                              
                              {contact.venue_name && (
                                <p className="text-xs text-findvenue mt-0.5 truncate">
                                  {contact.venue_name}
                                </p>
                              )}
                              
                              <p className="text-sm text-findvenue-text-muted truncate mt-0.5">
                                {contact.last_message}
                              </p>
                            </div>
                            
                            {contact.unread_count > 0 && (
                              <Badge className="bg-findvenue text-white ml-2">
                                {contact.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="unread" className="m-0">
                  {isLoading ? (
                    <div className="p-4 text-center text-findvenue-text-muted">
                      Loading contacts...
                    </div>
                  ) : filteredContacts.filter(c => c.unread_count > 0).length === 0 ? (
                    <div className="p-4 text-center text-findvenue-text-muted">
                      No unread messages
                    </div>
                  ) : (
                    <div className="divide-y divide-findvenue-surface/50">
                      {filteredContacts
                        .filter(c => c.unread_count > 0)
                        .map((contact) => (
                          <div
                            key={contact.user_id}
                            className={`px-4 py-3 cursor-pointer hover:bg-findvenue-surface/20 transition-colors ${
                              selectedContact?.user_id === contact.user_id ? 'bg-findvenue-surface/30' : ''
                            }`}
                            onClick={() => handleContactSelect(contact)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src="" />
                                <AvatarFallback>
                                  {contact.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <p className="font-medium truncate">{contact.full_name}</p>
                                  <span className="text-xs text-findvenue-text-muted whitespace-nowrap ml-2">
                                    {formatMessageTime(contact.last_message_time)}
                                  </span>
                                </div>
                                
                                {contact.venue_name && (
                                  <p className="text-xs text-findvenue mt-0.5 truncate">
                                    {contact.venue_name}
                                  </p>
                                )}
                                
                                <p className="text-sm text-findvenue-text-muted truncate mt-0.5">
                                  {contact.last_message}
                                </p>
                              </div>
                              
                              <Badge className="bg-findvenue text-white ml-2">
                                {contact.unread_count}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-white/10 lg:col-span-2">
            {selectedContact ? (
              <DirectChat 
                receiverId={selectedContact.user_id}
                receiverName={selectedContact.full_name}
                venueId={selectedContact.venue_id}
                venueName={selectedContact.venue_name}
              />
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center p-6 text-findvenue-text-muted">
                <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-center">Select a conversation to start messaging</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper function to format message time
function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date >= today) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date >= yesterday) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export default Messages;
