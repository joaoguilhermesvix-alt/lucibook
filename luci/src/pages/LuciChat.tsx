import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareHeart, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function LuciChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Sou a Luci, sua assistente inteligente. Sabia que meu nome é Luci porque foi inspirado na melhor amiga do meu desenvolvedor? O nome dela é Luciana. Será que um dia vou conhecê-la? Ai, meu Deus… espero que não seja você!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Add empty assistant message to stream into
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      // Fetch contextual data broadly (for a real prod app, you might want to summarize or limit this)
      const [appointmentsSnap, clientsSnap, inventorySnap, expensesSnap] = await Promise.all([
        getDocs(collection(db, "appointments")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "inventory")),
        getDocs(collection(db, "expenses"))
      ]);

      const systemContext = {
        appointments: appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        clients: clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        inventory: inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        expenses: expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };

      const response = await fetch("/api/lucichat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, systemContext })
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com o servidor.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let assistantContent = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim() === "data: [DONE]") {
              setIsLoading(false);
              return;
            }
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(5));
                if (data.content) {
                  assistantContent += data.content;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = assistantContent;
                    return newMsgs;
                  });
                }
              } catch (e) {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = "Desculpe, ocorreu um erro: " + err.message;
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-48px)]">
      <div className="flex items-center gap-3 mb-6 bg-white/70 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-sm shrink-0">
        <div className="w-12 h-12 bg-gradient-to-tr from-pink-400 to-pink-300 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-200">
          <MessageSquareHeart className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            LuciChat
          </h1>
          <p className="text-sm text-sub">Inteligência Avançada para Cílios e Beleza</p>
        </div>
      </div>

      <div className="flex-1 glass-panel flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 no-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" 
                    ? "bg-gray-100 text-gray-500" 
                    : "bg-pink-100 text-pink-500"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-gray-800 to-gray-700 text-white rounded-tr-sm"
                    : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm relative overflow-hidden"
                }`}>
                  {msg.role === "assistant" && (
                    <Sparkles className="w-24 h-24 absolute -bottom-4 -right-4 text-pink-50/50 -z-10" />
                  )}
                  {msg.content || <span className="animate-pulse">...</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-2" />
        </div>

        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 shrink-0 z-20 relative">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou comando..."
              disabled={isLoading}
              className="w-full bg-gray-50 border-0 rounded-full pl-6 pr-14 py-4 text-[15px] focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 w-10 h-10 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 shadow-md"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 translate-x-px translate-y-[-1px]" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
