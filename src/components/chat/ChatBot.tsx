
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input'; 
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m FindVenue Assistant. How can I help you today?' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [venueInfo, setVenueInfo] = useState<any | null>(null);

  // Fetch venue details if we're on a venue details page
  useEffect(() => {
    const fetchVenueInfo = async () => {
      if (id && location.pathname.includes('/venue/')) {
        try {
          console.log("Fetching venue info for assistant:", id);
          const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching venue data:", error);
            return;
          }

          if (data) {
            console.log("Venue data fetched for assistant:", data.name);
            setVenueInfo(data);
            
            // Update initial message to be venue-specific
            setMessages([
              { 
                role: 'assistant', 
                content: `Hi! I'm FindVenue Assistant. I can help you with information about ${data.name}. Feel free to ask about pricing, capacity, amenities, or booking this venue!` 
              },
            ]);
          }
        } catch (err) {
          console.error("Error in venue fetch:", err);
        }
      }
    };

    fetchVenueInfo();
  }, [id, location.pathname]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    const userMessage = message;
    setMessage('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Simulate AI response
    setIsLoading(true);
    
    try {
      // Here we would normally call an AI API
      // For this demo, we'll generate responses based on user input and venue context
      
      setTimeout(() => {
        let response = '';
        const lowerCaseMessage = userMessage.toLowerCase();
        
        if (venueInfo) {
          // Venue-specific responses
          if (lowerCaseMessage.includes('price') || lowerCaseMessage.includes('cost') || lowerCaseMessage.includes('fee')) {
            response = `${venueInfo.name} pricing starts at ${venueInfo.currency} ${venueInfo.starting_price.toLocaleString()} per booking.`;
            if (venueInfo.price_per_person > 0) {
              response += ` There's also a price per person of ${venueInfo.currency} ${venueInfo.price_per_person}.`;
            }
          } else if (lowerCaseMessage.includes('capacity') || lowerCaseMessage.includes('people') || lowerCaseMessage.includes('guests')) {
            response = `${venueInfo.name} can accommodate between ${venueInfo.min_capacity} and ${venueInfo.max_capacity} guests.`;
          } else if (lowerCaseMessage.includes('amenities') || lowerCaseMessage.includes('facilities') || lowerCaseMessage.includes('features')) {
            const amenitiesList = venueInfo.amenities.join(', ');
            response = `${venueInfo.name} offers these amenities: ${amenitiesList}.`;
            if (venueInfo.wifi) response += " WiFi is available.";
            if (venueInfo.parking) response += " Parking facilities are available.";
          } else if (lowerCaseMessage.includes('location') || lowerCaseMessage.includes('address') || lowerCaseMessage.includes('where')) {
            response = `${venueInfo.name} is located at ${venueInfo.address} in ${venueInfo.city_name}.`;
          } else if (lowerCaseMessage.includes('book') || lowerCaseMessage.includes('reserve') || lowerCaseMessage.includes('availability')) {
            response = `To book ${venueInfo.name}, you can use the booking form on this page. Available days include: ${venueInfo.availability.join(', ')}. You can also message the venue host directly.`;
          } else if (lowerCaseMessage.includes('contact') || lowerCaseMessage.includes('owner') || lowerCaseMessage.includes('host')) {
            response = `You can contact the venue host directly by clicking the "Message Venue Host" button on this page. They'll respond to your inquiries about ${venueInfo.name}.`;
          } else {
            response = `${venueInfo.name} is a ${venueInfo.category_name} venue located in ${venueInfo.city_name}. Is there something specific you'd like to know about this venue?`;
          }
        } else {
          // General responses
          if (lowerCaseMessage.includes('venue')) {
            response = 'FindVenue helps you discover and book the perfect venue for your events. You can browse venues by city or category, and filter by capacity and price.';
          } else if (lowerCaseMessage.includes('book') || lowerCaseMessage.includes('reservation')) {
            response = 'To book a venue, navigate to the venue details page and use the booking form. You can select your preferred date and time, and provide details about your event.';
          } else if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
            response = 'Hello! How can I assist you with FindVenue today?';
          } else if (lowerCaseMessage.includes('thank')) {
            response = "You're welcome! Let me know if you need anything else.";
          } else {
            response = "I'm here to help you find and book venues. You can ask about specific venues, booking process, or browse available options by city or category.";
          }
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-findvenue hover:bg-findvenue-dark shadow-lg p-0"
        >
          <MessageSquare size={24} />
        </Button>
      ) : (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-lg border border-white/10 glass-card flex flex-col">
          <div className="bg-findvenue p-3 flex justify-between items-center rounded-t-lg">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="FindVenue Assistant" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <span className="font-medium text-white">FindVenue Assistant</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-findvenue-dark">
              <X size={18} />
            </Button>
          </div>
          
          <CardContent className="flex-1 overflow-y-auto p-3">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-findvenue text-white'
                        : 'bg-findvenue-surface/30 border border-white/10'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-findvenue-surface/30 border border-white/10">
                    <Loader2 className="h-5 w-5 animate-spin text-findvenue" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          <CardFooter className="p-3 pt-0">
            <form onSubmit={handleSendMessage} className="w-full flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="bg-findvenue hover:bg-findvenue-dark" disabled={!message.trim() || isLoading}>
                <Send size={18} />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default ChatBot;
