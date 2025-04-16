
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [venueInfo, setVenueInfo] = useState<any | null>(null);
  const [venues, setVenues] = useState<any[]>([]);

  // Fetch venues for recommendations
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('id, name, city_name, category_name, image_url')
          .limit(10);

        if (error) {
          console.error("Error fetching venues:", error);
          return;
        }

        if (data) {
          setVenues(data);
        }
      } catch (err) {
        console.error("Error in venues fetch:", err);
      }
    };

    fetchVenues();
  }, []);

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
    
    setIsLoading(true);
    
    try {
      // Call the OpenAI-powered edge function
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: {
          query: userMessage,
          venueId: venueInfo?.id || null,
          type: 'chat'
        }
      });
      
      if (error) {
        throw error;
      }
      
      let response = data?.answer;
      
      // If we've got venue recommendations, format them as clickable links
      if (data?.venues) {
        response += "\n\nHere are some venues you might be interested in:\n";
        data.venues.forEach((venue: any, index: number) => {
          response += `\n${index + 1}. ${venue.name} in ${venue.city_name}`;
        });
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Fall back to the rule-based responses
      let response = '';
      const lowerCaseMessage = userMessage.toLowerCase();
      
      if (lowerCaseMessage.includes('venue')) {
        response = 'I can help you find the perfect venue for your event. Would you like to browse by location or event type?';
        // Add recommendations of actual venues
        if (venues.length > 0) {
          response += "\n\nHere are some popular venues you might like:";
          venues.slice(0, 3).forEach(venue => {
            response += `\n• <a href="/venue/${venue.id}" class="text-blue-400 hover:underline">${venue.name}</a> in ${venue.city_name}`;
          });
        }
      } else if (lowerCaseMessage.includes('find') || lowerCaseMessage.includes('search')) {
        response = 'You can search for venues using the search bar at the top of the page, or browse venues by city or category.';
      } else if (lowerCaseMessage.includes('book') || lowerCaseMessage.includes('reservation')) {
        response = 'To book a venue, navigate to the venue details page and use the booking form. You can select your preferred date and time, and provide details about your event.';
      } else if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
        response = 'Hello! How can I assist you with FindVenue today?';
      } else if (lowerCaseMessage.includes('thank')) {
        response = "You're welcome! Let me know if you need anything else.";
      } else {
        response = "I'm here to help you find and book venues. You can ask about specific venues, the booking process, or browse available options by city or category.";
        // Add links to popular venues
        if (venues.length > 0) {
          response += "\n\nHere are some trending venues right now:";
          venues.slice(0, 3).forEach(venue => {
            response += `\n• <a href="/venue/${venue.id}" class="text-blue-400 hover:underline">${venue.name}</a>`;
          });
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle clicking on venue links in messages
  const handleMessageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href) {
        e.preventDefault();
        navigate(href);
        setIsOpen(false);
      }
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
          
          <CardContent className="flex-1 overflow-y-auto p-3" onClick={handleMessageClick}>
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
                    dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
                  />
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
