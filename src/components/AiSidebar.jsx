/* global TextDecoder */
import { Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { getUserLearningContext } from "../services/learningService.js";

export function AiSidebar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadContext() {
      if (user) {
        const ctx = await getUserLearningContext(user.uid);
        setContext(ctx);
      }
    }
    loadContext();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch('/api/ai-tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: nextMessages,
          context: context
        }),
      });

      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantReply = "";

      // Add the assistant message as a placeholder for streaming
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantReply += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantReply };
          return updated;
        });
      }
    } catch (err) {
      console.error("AI Assistant Error:", err);
      setError(err.message || "An unexpected error occurred.");
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "I'm having trouble connecting to my brain right now. Please try again in a moment!" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-secondary to-primary text-white shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-primary/30 ${
        open ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"
      }`}
      aria-label="Open AI assistant"
    >
      <Sparkles size={22} />
    </button>


       <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          inert={!open}
          aria-hidden={!open}
          style={{ visibility: open ? 'visible' : 'hidden' }}
       >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
           <div className="flex items-center gap-2">
             <MessageSquare className="text-primary" size={18} />
             <div>
               <p className="text-sm font-black text-text-primary">AI Assistant</p>
               <p className="text-xs text-text-secondary">Context from your Forge subjects</p>
             </div>
           </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border bg-surface p-2 text-text-secondary transition-colors hover:bg-primary hover:text-white"
              aria-label="Close AI assistant"
            >
              <X size={18} />
            </button>

         </div>

         <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background p-4">
           {messages.length ? (
             <div className="grid gap-3">
               {messages.map((message, index) => (
                 <div
                   key={`${message.role}-${index}`}
                   className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm leading-relaxed transition-all ${
                      message.role === "user"
                        ? "ml-auto bg-secondary text-white shadow-sm"
                        : "border border-border bg-surface text-text-primary shadow-sm"

                   }`}
                 >
                   {message.content}
                 </div>
               ))}
               {loading ? (
                 <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
                   <Loader2 size={16} className="animate-spin text-primary" />
                   Thinking...
                 </div>
               ) : null}
             </div>
           ) : (
             <EmptyState
               title="Ask about your notes"
               copy="The assistant uses your Forge subjects, units, sub-units, lessons, and uploaded material whenever possible."
             />
           )}
         </div>

         {error ? <p className="border-t border-status-error/20 bg-status-error/10 px-4 py-2 text-xs font-bold text-status-error">{error}</p> : null}

         <form onSubmit={handleSubmit} className="border-t border-border p-4 bg-surface">
           <div className="flex gap-2">
             <input
               value={input}
               onChange={(event) => setInput(event.target.value)}
               placeholder="Ask a study question..."
               className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
               disabled={loading}
             />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-primary px-3 py-2 text-white transition-all hover:bg-primary-active disabled:bg-background disabled:text-text-muted"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>

           </div>
         </form>
      </aside>
    </>
  );
}
