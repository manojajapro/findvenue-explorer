
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, X, Loader2, MessageSquare, LayoutDashboard, Settings, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Venue } from '@/hooks/useSupabaseVenues';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

// Local storage key for chat history
const CHAT_HISTORY_KEY = 'findvenue-chat-history';
const MAX_CHAT_HISTORIES = 10;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  venues?: Venue[];
  timestamp: number;
};

type ChatHistory = {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
};

const SmartVenueAssistant = () => {
  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Chat state
  const [currentChatId, setCurrentChatId] = useState<string>(() => crypto.randomUUID());
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: 'Hi! I\'m FindVenue Assistant. Ask me about venues, locations, features, or anything venue-related!',
      timestamp: Date.now()
    }
  ]);
  
  // Input state
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([
    "Show me event venues in Riyadh",
    "What are the best wedding halls?",
    "Find venues with parking available",
    "Show me venues that can host 100+ people",
    "What venues are available this weekend?"
  ]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Load chat histories from local storage
  useEffect(() => {
    const savedHistories = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistories) {
      try {
        const parsedHistories = JSON.parse(savedHistories);
        setChatHistories(parsedHistories);
        
        // If we have histories, set the current chat to the most recent one
        if (parsedHistories.length > 0) {
          const mostRecent = [...parsedHistories].sort((a, b) => b.lastUpdated - a.lastUpdated)[0];
          setCurrentChatId(mostRecent.id);
          setMessages(mostRecent.messages);
        }
      } catch (e) {
        console.error("Error loading chat histories:", e);
      }
    }
  }, []);
  
  // Save current chat to history
  const saveCurrentChat = useCallback(() => {
    if (messages.length <= 1) return; // Don't save empty chats
    
    setChatHistories(prevHistories => {
      // Find if this chat already exists in history
      const existingIndex = prevHistories.findIndex(h => h.id === currentChatId);
      
      // Create chat title from first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage 
        ? firstUserMessage.content.length > 30 
          ? `${firstUserMessage.content.substring(0, 30)}...` 
          : firstUserMessage.content
        : "New conversation";
      
      let newHistories;
      
      if (existingIndex !== -1) {
        // Update existing chat
        newHistories = [...prevHistories];
        newHistories[existingIndex] = {
          ...newHistories[existingIndex],
          messages: [...messages],
          title,
          lastUpdated: Date.now()
        };
      } else {
        // Add new chat
        newHistories = [
          ...prevHistories,
          {
            id: currentChatId,
            title,
            messages: [...messages],
            lastUpdated: Date.now()
          }
        ];
        
        // Limit number of saved chats
        if (newHistories.length > MAX_CHAT_HISTORIES) {
          newHistories = newHistories.sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, MAX_CHAT_HISTORIES);
        }
      }
      
      // Save to localStorage
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newHistories));
      
      return newHistories;
    });
  }, [currentChatId, messages]);
  
  // Save chat when messages change
  useEffect(() => {
    if (messages.length > 1) {
      saveCurrentChat();
    }
  }, [messages, saveCurrentChat]);

  // Initialize audio element for text-to-speech
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.onplay = () => setIsSpeaking(true);
    audioElementRef.current.onended = () => setIsSpeaking(false);
    audioElementRef.current.onerror = () => setIsSpeaking(false);
    
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setMessage(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Error",
          description: "Speech recognition error. Please try again.",
          variant: "destructive",
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start voice input
  const startListening = async () => {
    if (!recognitionRef.current) {
      initSpeechRecognition();
    }
    
    try {
      if (recognitionRef.current) {
        await recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop voice input
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      handleSendMessage();
    }
  };

  // Toggle voice response
  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    
    if (isSpeaking && audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsSpeaking(false);
    }

    toast({
      title: audioEnabled ? "Voice responses disabled" : "Voice responses enabled",
      description: audioEnabled ? "Assistant will now respond with text only" : "Assistant will now speak responses",
    });
  };

  // Text-to-speech function
  const speakText = async (text: string): Promise<void> => {
    if (!text || !audioEnabled) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Sarah voice
        }
      });
      
      if (error) throw new Error(error.message);
      if (!data?.audio) throw new Error('No audio received from TTS service');
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.src = `data:audio/mp3;base64,${data.audio}`;
        await audioElementRef.current.play();
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Audio Error",
        description: "Failed to play voice response",
        variant: "destructive",
      });
    }
  };

  // Send message to assistant
  const handleSendMessage = async (e?: React.FormEvent, overrideMessage?: string) => {
    if (e) e.preventDefault();
    
    const userMessage = overrideMessage || message;
    if ((!userMessage.trim() || isLoading) && !overrideMessage) return;
    
    setMessage('');
    setIsLoading(true);
    
    // Add user message to chat with a unique ID
    const userMsg: Message = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: userMessage.trim(), 
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    try {
      // Improve query by detecting specific intent patterns
      const lowerCaseMsg = userMessage.toLowerCase();
      const isLocationQuery = /find|show|near|in\s+(\w+)|closest|nearest/i.test(lowerCaseMsg);
      const isCapacityQuery = /(\d+)\s+(people|guests|capacity)|capacity\s+of\s+(\d+)/i.test(lowerCaseMsg);
      const isPricingQuery = /price|cost|expensive|cheap|affordable|budget/i.test(lowerCaseMsg);
      const isCategoryQuery = /wedding|conference|meeting|birthday|party|corporate|outdoor|indoor/i.test(lowerCaseMsg);
      
      // Enhanced query parameters
      const enhancedParams: any = {
        query: userMessage,
        type: 'home',
        enhancedSearch: {
          isLocationQuery,
          isCapacityQuery,
          isPricingQuery,
          isCategoryQuery
        }
      };
      
      // Call AI assistant edge function with enhanced parameters
      const { data, error } = await supabase.functions.invoke('venue-assistant', {
        body: enhancedParams
      });
      
      if (error) throw new Error(error.message);
      
      // Add assistant response to chat
      if (data?.answer) {
        const newMessage: Message = { 
          id: crypto.randomUUID(),
          role: 'assistant', 
          content: data.answer,
          timestamp: Date.now()
        };
        
        // Add venues if available
        if (data.venues && Array.isArray(data.venues)) {
          newMessage.venues = data.venues;
        }
        
        setMessages(prev => [...prev, newMessage]);
        
        // Update suggested queries based on conversation context
        if (data.suggestedQueries && Array.isArray(data.suggestedQueries)) {
          setSuggestedQueries(data.suggestedQueries.slice(0, 5));
        }
        
        // Play audio response if enabled
        if (audioEnabled) {
          await speakText(data.answer);
        }
      }
    } catch (error) {
      console.error('Error in assistant call:', error);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.', 
        timestamp: Date.now()
      }]);
      
      toast({
        title: "Error",
        description: "Failed to get a response from the assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to venue details
  const handleVenueClick = (venueId: string) => {
    navigate(`/venue/${venueId}`);
    setIsOpen(false);
  };
  
  // Clear chat history
  const clearChat = () => {
    const newId = crypto.randomUUID();
    setCurrentChatId(newId);
    setMessages([{ 
      id: crypto.randomUUID(),
      role: 'assistant', 
      content: 'Hi! I\'m FindVenue Assistant. Ask me about venues, locations, features, or anything venue-related!',
      timestamp: Date.now()
    }]);
    toast({
      title: "Chat cleared",
      description: "New conversation started",
    });
  };
  
  // Delete a saved chat
  const deleteChat = (id: string) => {
    setChatHistories(prev => {
      const newHistories = prev.filter(h => h.id !== id);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newHistories));
      return newHistories;
    });
    
    // If we're deleting the current chat, start a new one
    if (id === currentChatId) {
      clearChat();
    }
  };
  
  // Load a saved chat
  const loadChat = (id: string) => {
    const chatToLoad = chatHistories.find(h => h.id === id);
    if (chatToLoad) {
      setCurrentChatId(id);
      setMessages(chatToLoad.messages);
    }
  };
  
  // Export chat history as JSON
  const exportChat = () => {
    try {
      const chatToExport = chatHistories.find(h => h.id === currentChatId);
      if (!chatToExport) return;
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chatToExport, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `findvenue-chat-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error("Error exporting chat:", e);
      toast({
        title: "Export failed",
        description: "Could not export chat history",
        variant: "destructive",
      });
    }
  };
  
  // Toggle expanded mode
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const renderChatMessages = () => (
    <ScrollArea className="flex-1 p-3 overflow-y-auto">
      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="FindVenue Assistant" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              
              {/* Venue recommendations */}
              {msg.venues && msg.venues.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Recommended Venues
                  </Badge>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {msg.venues.slice(0, 4).map(venue => (
                      <div 
                        key={venue.id}
                        onClick={() => handleVenueClick(venue.id)}
                        className="p-2 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex"
                      >
                        <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 dark:bg-slate-800 mr-2 flex-shrink-0">
                          <img 
                            src={venue.imageUrl || '/placeholder.svg'} 
                            alt={venue.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{venue.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {venue.city || venue.address}
                          </p>
                          {venue.pricing?.startingPrice && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              {venue.pricing.currency || 'SAR'} {venue.pricing.startingPrice}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {msg.venues.length > 4 && (
                      <div 
                        className="p-2 rounded-md border border-dashed border-blue-200 dark:border-blue-800 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        onClick={() => navigate('/venues')}
                      >
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          + {msg.venues.length - 4} more venues
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Message timestamp */}
              <div className="mt-1 text-right">
                <span className="text-[10px] opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {/* Audio playback for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="mt-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => speakText(msg.content)}
                  >
                    <Volume2 size={12} />
                  </Button>
                </div>
              )}
            </div>
            
            {msg.role === 'user' && (
              <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Avatar className="h-8 w-8 mr-2 mt-1">
              <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="FindVenue Assistant" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="max-w-[85%] rounded-2xl p-4 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
  
  // Render conversation history
  const renderChatHistory = () => (
    <div className="flex-1 p-3 overflow-y-auto">
      {chatHistories.length > 0 ? (
        <div className="space-y-2">
          {chatHistories
            .sort((a, b) => b.lastUpdated - a.lastUpdated)
            .map(chat => (
              <div
                key={chat.id}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                  chat.id === currentChatId 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-slate-700'
                }`}
                onClick={() => loadChat(chat.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">{chat.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(chat.lastUpdated).toLocaleDateString()} • {chat.messages.length - 1} messages
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <MessageSquare size={24} className="text-gray-400" />
          </div>
          <h3 className="font-medium mb-1">No saved conversations</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start chatting and your conversations will be saved here
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full h-14 w-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg p-0 flex items-center justify-center"
          >
            <MessageSquare size={24} className="text-white" />
          </Button>
        </motion.div>
      )}
      
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className={`fixed ${isExpanded ? 'inset-6' : 'bottom-6 right-6 w-80 sm:w-96 h-[500px]'} shadow-2xl border border-blue-100 dark:border-blue-900 flex flex-col z-50 rounded-lg overflow-hidden`}
          >
            <Card className="flex flex-col h-full bg-white dark:bg-slate-900 shadow-xl">
              <CardHeader className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2 border-2 border-white/30">
                    <AvatarImage src="/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png" alt="FindVenue Assistant" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">FindVenue Assistant</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={toggleExpanded} className="text-white hover:bg-blue-700/50 h-8 w-8">
                    <LayoutDashboard size={16} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700/50 h-8 w-8">
                        <Settings size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={toggleAudio}>
                        {audioEnabled ? (
                          <><VolumeX className="mr-2 h-4 w-4" /> Disable voice</>
                        ) : (
                          <><Volume2 className="mr-2 h-4 w-4" /> Enable voice</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={clearChat}>
                        <Trash2 className="mr-2 h-4 w-4" /> Clear conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportChat}>
                        <Download className="mr-2 h-4 w-4" /> Export chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-blue-700/50 h-8 w-8">
                    <X size={16} />
                  </Button>
                </div>
              </CardHeader>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <div className="border-b border-gray-200 dark:border-slate-800 px-3">
                    <TabsList className="h-9 bg-transparent">
                      <TabsTrigger value="chat" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-9 px-4">
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-9 px-4">
                        History
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden p-0">
                    {renderChatMessages()}
                  </TabsContent>
                  
                  <TabsContent value="history" className="flex-1 flex flex-col mt-0 overflow-hidden p-0">
                    {renderChatHistory()}
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Suggested queries */}
              {activeTab === 'chat' && suggestedQueries.length > 0 && messages.length < 3 && (
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQueries.map((query, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors py-1"
                        onClick={() => handleSendMessage(undefined, query)}
                      >
                        {query}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Voice status indicators */}
              {isListening && (
                <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-800">
                  <div className="flex items-center text-green-700 dark:text-green-400">
                    <div className="relative">
                      <div className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></div>
                      <div className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></div>
                    </div>
                    <span className="ml-2 text-sm">Listening...</span>
                  </div>
                </div>
              )}
              
              {isSpeaking && (
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
                    <div className="flex items-center">
                      <Volume2 className="h-4 w-4 mr-2" />
                      <span className="text-sm">Speaking...</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 py-0 text-xs hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={() => {
                        if (audioElementRef.current) {
                          audioElementRef.current.pause();
                          audioElementRef.current.currentTime = 0;
                          setIsSpeaking(false);
                        }
                      }}
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              )}
              
              <CardFooter className="p-3 border-t dark:border-slate-800">
                <form onSubmit={handleSendMessage} className="w-full flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={searchInputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask about venues..."
                      className="pr-8"
                      disabled={isLoading || isListening}
                    />
                    
                    <Button 
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={isListening ? stopListening : startListening}
                      className="absolute right-1 top-1 h-8 w-8"
                      disabled={isLoading}
                    >
                      {isListening ? (
                        <MicOff size={16} className="text-red-500" />
                      ) : (
                        <Mic size={16} />
                      )}
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="bg-blue-600 hover:bg-blue-700 h-10 w-10"
                    disabled={!message.trim() || isLoading || isListening}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartVenueAssistant;
