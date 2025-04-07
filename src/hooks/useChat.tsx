
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatContact } from '@/components/chat/types';

export const useChat = (contactId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contact, setContact] = useState<ChatContact | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const venueId = queryParams.get('venueId');
  const venueName = queryParams.get('venueName');
  const bookingId = queryParams.get('bookingId');

  // Fetch contact info
  useEffect(() => {
    if (!user || !contactId) return;
    
    const fetchContactInfo = async () => {
      try {
        console.log('Fetching contact info for:', contactId);
        
        const { data: contactData, error: contactError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', contactId)
          .single();
        
        if (contactError) throw contactError;
        
        console.log('Contact data:', contactData);
        
        if (contactData) {
          const contactInfo: ChatContact = {
            id: contactData.id,
            name: `${contactData.first_name} ${contactData.last_name}`,
            image: contactData.profile_image || undefined,
            role: contactData.user_role === 'venue_owner' ? 'venue-owner' : 'customer'
          };
          
          if (venueId && venueName) {
            contactInfo.venue_id = venueId;
            contactInfo.venue_name = venueName;
          }
          
          setContact(contactInfo);
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
        setHasError(true);
        setErrorMessage('Failed to load contact information');
      }
    };
    
    fetchContactInfo();
  }, [contactId, user, venueId, venueName]);

  // Fetch messages and subscribe to new ones
  useEffect(() => {
    if (!user || !contactId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);
    
    const fetchMessages = async () => {
      try {
        console.log('Fetching messages between', user.id, 'and', contactId);
        
        // Using the get_conversation RPC function to fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .rpc('get_conversation', {
            current_user_id: user.id,
            other_user_id: contactId
          });

        if (messagesError) throw messagesError;
        
        console.log('Messages data:', messagesData);
        setMessages(messagesData || []);
        
        // Mark received messages as read
        const unreadMessages = messagesData?.filter(
          (msg: Message) => msg.receiver_id === user.id && !msg.read
        );
        
        if (unreadMessages?.length > 0) {
          const unreadIds = unreadMessages.map((msg: Message) => msg.id);
          
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadIds);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setHasError(true);
        setErrorMessage('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        
        if ((newMsg.sender_id === contactId && newMsg.receiver_id === user.id) || 
            (newMsg.sender_id === user.id && newMsg.receiver_id === contactId)) {
          setMessages(prev => [...prev, newMsg]);
          
          // Mark received messages as read automatically
          if (newMsg.receiver_id === user.id && !newMsg.read) {
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        }
      })
      .subscribe();
    
    // Send initial message if it's a new conversation with venue context
    const sendInitialMessage = async () => {
      if (venueId && venueName && !bookingId) {
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
          .limit(1);
          
        if (!existingMessages?.length) {
          const initialMessage = `Hi, I'm interested in ${venueName}.`;
          await sendMessageToDatabase(initialMessage);
        }
      } else if (bookingId && venueName) {
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
          .eq('booking_id', bookingId)
          .limit(1);
          
        if (!existingMessages?.length) {
          const initialMessage = `Hi, I have a question about my booking at ${venueName}.`;
          await sendMessageToDatabase(initialMessage, bookingId);
        }
      }
    };
    
    if (venueId && venueName && contactId) {
      sendInitialMessage();
    }

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [contactId, user, venueId, venueName, bookingId]);

  const sendMessageToDatabase = async (messageContent: string, bookingId?: string) => {
    if (!user || !contactId) return null;
    
    try {
      const messageData = {
        sender_id: user.id,
        receiver_id: contactId,
        content: messageContent,
        venue_id: venueId || undefined,
        venue_name: venueName || undefined,
        booking_id: bookingId || undefined,
        read: false
      };
      
      const { data: sentMessage, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
      
      if (error) throw error;
      
      return sentMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !contactId || isSending) return;
    
    setIsSending(true);
    
    try {
      const sentMessage = await sendMessageToDatabase(newMessage.trim());
      
      if (sentMessage) {
        // Message will be added via subscription
        setNewMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
    isLoading,
    isSending,
    hasError,
    errorMessage,
    contact,
    messagesEndRef
  };
};
