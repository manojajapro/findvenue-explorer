import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const apiUrl =
  "https://esdmelfzeszjtbnoajig.functions.supabase.co/smart-venue-assistant";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function HomeVenueAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! Ask me about venues and events in Saudi Arabia, e.g. 'find riyadh venues', or mention any features, budget, etc.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TTS: Play a text via browser speechSynthesis
  function playSpeech(text: string) {
    if ("speechSynthesis" in window) {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  }

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMsg,
          type: 'search'
        }),
      });
      
      if (!resp.ok) {
        throw new Error("Unable to get answer from assistant");
      }
      
      const data = await resp.json();
      
      // Format the answer with venue details if available
      let formattedAnswer = data.answer;
      if (data.venues && data.venues.length > 0) {
        formattedAnswer += "\n\nHere are the matching venues:\n\n";
        data.venues.forEach((venue: any) => {
          formattedAnswer += `📍 ${venue.name} (${venue.city})\n`;
          formattedAnswer += `   • Capacity: ${venue.capacity}\n`;
          formattedAnswer += `   • Price: ${venue.price}\n`;
          formattedAnswer += `   • Rating: ${venue.rating}\n`;
          if (venue.image) {
            formattedAnswer += `   • [View Images](${venue.image})\n`;
          }
          formattedAnswer += "\n";
        });
      }
      
      setMessages((prev) => [...prev, { role: "assistant", content: formattedAnswer }]);
    } catch (e: any) {
      setError(e.message || "Answer unavailable");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't answer your request." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto mt-8 bg-slate-900/90 border-slate-600 p-0 shadow-2xl">
      <div className="bg-slate-800 p-4 flex items-center gap-2 rounded-t-lg justify-between">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-600" />
          <span className="text-lg font-bold text-white">Venue Assistant</span>
          <span className="ml-2 text-sm text-slate-300">Ask me about venues and events</span>
        </div>
        <span>
          <Volume2
            className="cursor-pointer text-blue-400 hover:text-blue-600"
            aria-label="Test audio"
            onClick={() => playSpeech("Venue Assistant is ready to help you!")}
          />
        </span>
      </div>
      <ScrollArea className="max-h-[400px] h-80 p-4 overflow-y-auto bg-transparent">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-center gap-3 max-w-[80%] ${
                  m.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center ${
                    m.role === "user" ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  {m.role === "user" ? (
                    <span className="text-white font-bold">U</span>
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-2 text-sm break-words relative ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 border border-white/10 text-gray-100"
                  }`}
                >
                  {m.content}
                  {m.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -right-5 top-2 text-blue-400 hover:text-blue-600 bg-transparent"
                      title="Read aloud"
                      onClick={() => playSpeech(m.content)}
                      aria-label="Read This Message Aloud"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-gray-800 border border-white/10">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <form className="border-t border-white/10 p-4 flex gap-2" onSubmit={submit}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? "Please wait..." : "Ask about any venue, city, or feature..."}
          className="flex-1 bg-gray-800/60 border-gray-700 focus-visible:ring-blue-500"
          disabled={isLoading}
          autoFocus
        />
        <Button type="submit" disabled={!input.trim() || isLoading} className={isLoading ? "bg-gray-700" : "bg-blue-600 hover:bg-blue-700"}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      {error && <div className="text-red-500 text-sm px-4 pb-2">{error}</div>}
    </Card>
  );
}
