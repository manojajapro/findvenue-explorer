
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Message, ChatContact } from '@/components/chat/types';

export const useChat = (contactId: string | undefined) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [contact, setContact] = useState<ChatContact>({
    id: '',
    name: 'Contact',
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          setContact({
            id: contactId,
            name: `${contactData.first_name} ${contactData.last_name}`,
            role: contactData.user_role,
            image: contactData.profile_image
          });
          console.log("Contact data fetched:", contactData);
        } else {
          setHasError(true);
          setErrorMessage('Contact not found. Please try again or select a different contact.');
          throw new Error('Contact not found');
        }
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
            
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          throw messagesError;
        }

        if (messagesData && messagesData.length > 0) {
          console.log("Fetched messages:", messagesData.length);
          setMessages(messagesData);
          
          const venueMessage = messagesData.find(msg => msg.venue_id && msg.venue_name);
          if (venueMessage) {
            setContact(prev => ({
              ...prev,
              venueId: venueMessage.venue_id || null,
              venueName: venueMessage.venue_name || null
            }));
          }
          
          const unreadMessageIds = messagesData
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
        setHasError(true);
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
      console.log("Sending welcome message to", contactFirstName);
      const welcomeMessage = `Hello ${contactFirstName}! I'm interested in discussing more. Can you please provide more information?`;
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: contactId,
          content: welcomeMessage,
          sender_name: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
          receiver_name: contact.name || undefined,
          venue_id: contact.venueId || undefined,
          venue_name: contact.venueName || undefined,
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
            venue_id: contact.venueId || null
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
        receiver_name: contact.name || undefined,
        venue_id: contact.venueId || undefined,
        venue_name: contact.venueName || undefined,
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
            venue_id: contact.venueId || null
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

  return {
    contact,
    messages,
    newMessage,
    setNewMessage,
    isLoading,
    isSending,
    hasError,
    errorMessage,
    messagesEndRef,
    sendMessage
  };
};
