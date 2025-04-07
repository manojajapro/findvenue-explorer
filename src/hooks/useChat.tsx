
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useLocation } from 'react-router-dom';
import { Message, ChatContact } from '@/components/chat/types';
import { useAuth } from '@/hooks/useAuth';

export const useChat = (contactId?: string) => {
  const { user } = useAuth();
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
    if (!contactId || !user) {
      setIsLoading(false);
      return;
    }

    const fetchContactInfo = async () => {
      try {
        console.log('Fetching contact info for:', contactId);
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, user_role, profile_image')
          .eq('id', contactId)
          .single();

        if (userError) throw userError;

        console.log('Contact data:', userData);
        
        // Set contact information
        setContact({
          id: userData.id,
          name: `${userData.first_name} ${userData.last_name}`,
          role: userData.user_role === 'venue_owner' ? 'venue-owner' : 'customer',
          image: userData.profile_image || '',
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
        console.log('Fetching messages between', user.id, 'and', contactId);
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        
        console.log('Messages data:', messagesData);
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
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', contactId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    // Initial fetch
    fetchContactInfo();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New message received:', payload);
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
      supabase.removeChannel(subscription);
    };
  }, [contactId, user, venueId, venueName]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !contactId || !user || isSending) return;
    
    setIsSending(true);
    
    try {
      console.log('Sending message to:', contactId);
      
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
        receiver_name: contact?.name || 'User',
        venue_id: contact?.venue_id || venueId || null,
        venue_name: contact?.venue_name || venueName || null,
        booking_id: bookingId || null,
        read: false
      };
      
      console.log('Message data:', messageData);
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('Message sent successfully:', data);
      setMessages(prev => [...prev, data]);
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
