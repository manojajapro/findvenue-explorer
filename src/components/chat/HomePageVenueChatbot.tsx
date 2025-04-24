
import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useAuth } from '@/hooks/useAuth';
import { ChatContact } from './types';

// Create a mock implementation of useChat since the real one doesn't have the props we need
const useVenueSearchChat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Add the user message to the chat
    const userMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Simulate AI response after a delay
      setTimeout(() => {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          content: "I'm a venue search assistant. I can help you find venues in your area. This is just a placeholder message as the actual AI integration is not implemented yet.",
          role: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  };
  
  return { messages, sendMessage, isLoading, error };
};

const HomePageVenueChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isVenueOwner } = useAuth();
  const { messages, sendMessage, isLoading, error } = useVenueSearchChat();
  
  // Don't render anything if the user is a venue owner
  if (isVenueOwner) {
    return null;
  }

  return (
    <>
      {/* Fixed positioned chatbot button - right bottom */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed right-4 bottom-4 z-50">
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full h-14 w-14 shadow-xl flex items-center justify-center border border-blue-500/20"
                aria-label="Venue Search Assistant"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-blue-950 text-white border-blue-800">
            <p>Chat with Venue Search Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Dialog for chatbot */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-[500px] p-0 overflow-hidden max-h-[80vh] right-[5%] sm:right-[5%] translate-x-0 bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 shadow-2xl rounded-xl"
        >
          <div className="absolute top-2 right-2 z-10">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <div className="flex flex-col h-[70vh]">
            {/* Custom chat header instead of using ChatHeader component */}
            <div className="p-3 border-b border-white/10 flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium">Venue Search Assistant</h3>
                <p className="text-xs text-gray-400">AI Assistant</p>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-gray-800 text-white">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 text-red-200 border border-red-500/50">
                  Error: {error.message || 'Failed to send message'}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage((e.target as HTMLFormElement).message.value); (e.target as HTMLFormElement).reset(); }}>
                <div className="flex items-center space-x-2">
                  <input 
                    name="message" 
                    className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ask about venues..."
                  />
                  <Button type="submit" disabled={isLoading}>
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomePageVenueChatbot;
