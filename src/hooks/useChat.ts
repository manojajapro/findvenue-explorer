import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatContact } from '@/components/chat/types';
import { useAuth } from './useAuth';

export const useChat = (contactId?: string) => {
  const { user } = useAuth();
  const [contact, setContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;

    try {
      console.log('Fetching contact info for:', contactId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_image, user_role')
        .eq('id', contactId)
        .single();

      if (error) {
        console.error('Error fetching contact:', error);
        throw error;
      }

      if (data) {
        console.log('Contact data:', data);
        setContact({
          id: data.id,
          name: `${data.first_name} ${data.last_name}`,
          image: data.profile_image || undefined,
          role: data.user_role === 'venue-owner' ? 'venue-owner' : 'customer',
          status: 'Online' // You can make this dynamic based on user's online status
        });
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error);
      setHasError(true);
      setErrorMessage('Failed to load contact information');
    }
  }, [contactId]);

  const fetchMessages = useCallback(async () => {
    if (!contactId || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setHasError(true);
      setErrorMessage('Failed to load messages');
    }
  }, [contactId, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !contactId || isSending) return;

    setIsSending(true);
    try {
      const message = {
        sender_id: user.id,
        receiver_id: contactId,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        read: false
      };

      const { error } = await supabase
        .from('messages')
        .insert([message]);

      if (error) throw error;

      setNewMessage('');
      await fetchMessages();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to send message:', error);
      setHasError(true);
      setErrorMessage('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    Promise.all([fetchContact(), fetchMessages()])
      .catch(error => {
        console.error('Error in initialization:', error);
        setHasError(true);
        setErrorMessage('Failed to initialize chat');
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${contactId},receiver_id=eq.${user?.id}`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [contactId, user, fetchContact, fetchMessages]);

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