
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { Message, ChatContact } from '@/components/chat/types';

export const useChat = (contactId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contact, setContact] = useState<ChatContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const venueId = searchParams.get('venueId');
  const venueName = searchParams.get('venueName');
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    if (!contactId) {
      setIsLoading(false);
      return;
    }

    const fetchContactInfo = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, user_role, avatar_url')
          .eq('id', contactId)
          .single();

        if (userError) throw userError;

        // Set contact information
        setContact({
          id: userData.id,
          name: `${userData.first_name} ${userData.last_name}`,
          role: userData.user_role,
          image: userData.avatar_url || '',
          venue_id: venueId || undefined,
          venue_name: venueName ? decodeURIComponent(venueName) : undefined,
        });

        // Start fetching messages
        fetchMessages();

        // Mark messages as read
        updateMessageReadStatus();

      } catch (error: any) {
        console.error('Error fetching contact info:', error);
        setHasError(true);
        setErrorMessage('Failed to fetch contact information');
        setIsLoading(false);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .rpc('get_conversation', { 
            current_user_id: (await supabase.auth.getUser()).data.user?.id,
            other_user_id: contactId 
          });

        if (messagesError) throw messagesError;

        setMessages(messagesData || []);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        setHasError(true);
        setErrorMessage('Failed to fetch messages');
        setIsLoading(false);
      }
    };

    const updateMessageReadStatus = async () => {
      try {
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('receiver_id', currentUserId)
          .eq('sender_id', contactId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    // Initial fetch
    fetchContactInfo();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${contactId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Only add message to state if it's for this conversation
          if (
            (newMessage.sender_id === contactId || newMessage.receiver_id === contactId)
          ) {
            setMessages((prev) => [...prev, newMessage]);
            updateMessageReadStatus();
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, venueId, venueName]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !contactId || !contact) return;
    
    setIsSending(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get the user profile to get the name
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
        
      const senderName = userProfile 
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'User';
      
      const messageData = {
        sender_id: user.id,
        receiver_id: contactId,
        content: newMessage.trim(),
        sender_name: senderName,
        receiver_name: contact.name,
        venue_id: contact.venue_id,
        venue_name: contact.venue_name,
        booking_id: bookingId || null,
        read: false
      };
      
      const { error } = await supabase
        .from('messages')
        .insert(messageData);
        
      if (error) throw error;
      
      setNewMessage('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    contact,
    isLoading,
    isSending,
    hasError,
    errorMessage,
    messagesEndRef,
    sendMessage,
  };
};
