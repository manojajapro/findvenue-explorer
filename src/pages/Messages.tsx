
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Message as MessageType, ChatContact } from '@/components/chat/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import DirectChat from '@/components/chat/DirectChat';

const Messages = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);
  
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
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts. Please refresh and try again.',
        variant: 'destructive',
      });
    }
  };
  
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
            {/* Contacts List - Left Panel */}
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
                            contactId === contact.id 
                              ? 'bg-findvenue/20 border border-findvenue/30' 
                              : 'hover:bg-findvenue-surface/30'
                          }`}
                          onClick={() => selectContact(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={contact.image} />
                              <AvatarFallback>
                                {getInitials(contact.name)}
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
            
            {/* Chat Area - Right Panel */}
            <div className="md:col-span-2">
              <Card className="glass-card border-white/10 h-[calc(100vh-240px)] flex flex-col">
                {!contactId ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-6">
                      <MessageSquare className="h-12 w-12 text-findvenue-text-muted opacity-50 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                      <p className="text-findvenue-text-muted">
                        Choose a contact from the list to start chatting
                      </p>
                    </div>
                  </div>
                ) : (
                  <DirectChat />
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
