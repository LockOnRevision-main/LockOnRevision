import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { MessageContent } from "./MessageContent.jsx";
import { getAiContext } from "../services/aiContextService.js";
import { apiFetch } from "../utils/apiFetch.js";
import i18n from "../i18n/index.js";

const MESSAGES_KEY = "lockon-ai-messages";

function loadMessages() {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-50)));
  } catch { /* noop */ }
}

export function AiSidebar() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const scrollRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/ai-status", { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((status) => {
        if (active) setAiStatus(status);
      })
      .catch(() => {
        if (active) setAiStatus(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the element is visible and focusable
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    async function loadContext() {
      if (user) {
        try {
          const ctx = await getAiContext(user.uid, profile);
          setContext(ctx);
        } catch {
          setContext(null);
        }
      }
    }
    loadContext();
  }, [user, profile]);

  // Persist messages to localStorage
  const setMessagesAndPersist = useCallback((updater) => {
    setMessages((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveMessages(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const abortRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!input.trim() || loading) return;

    // Cancel any previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abortController = new AbortController();
    abortRef.current = abortController;

    const userMessage = { role: "user", content: input.trim(), _id: `msg-${Date.now()}` };
    const nextMessages = [...messages, userMessage];
    setMessagesAndPersist(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch('/api/ai-tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({ 
          messages: nextMessages,
          context: context,
          preferredLanguage: i18n.language
        }),
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errData = await response.json();
          errorDetail = errData.error || '';
        } catch {}
        throw new Error(`API request failed: ${response.status}${errorDetail ? ` - ${errorDetail}` : ''}`);
      }

      const data = await response.json();
      const reply = data.reply || data.error || t("ai_sidebar.fallback_reply");
      setMessagesAndPersist([...nextMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("AI Assistant Error:", err);
      const raw = err.message || "";
      const userMessage = raw.includes("503") || raw.includes("gemini_not_configured")
        ? raw.replace("API request failed: 503 - ", "")
        : raw.includes("401") || raw.includes("Authentication failed")
          ? "The AI assistant is running in local demo mode. Please try again in a moment."
          : raw.includes("500")
            ? t("ai_sidebar.error_500")
            : raw || t("ai_sidebar.error_unexpected");
      setError(userMessage);
      setMessagesAndPersist([
        ...nextMessages,
        { role: "assistant", content: userMessage },
      ]);
    } finally {
      setLoading(false);
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
    }
  }

  return (
    <>
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(true)}
      className={`fixed bottom-5 right-5 z-30 grid h-13 w-13 place-items-center rounded-2xl bg-secondary p-3.5 text-white sm:bottom-6 sm:right-6 ${
        open ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"
      }`}
      style={{ boxShadow: "var(--shadow-elevated)" }}
      aria-label={t("ai.open")}
    >
      <Sparkles size={21} />
    </button>


       <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-surface transition-transform duration-200 ease-out sm:max-w-md ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ boxShadow: "var(--shadow-elevated)", visibility: open ? 'visible' : 'hidden' }}
          inert={!open ? "" : undefined}
          aria-hidden={!open}
       >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
           <div className="flex min-w-0 items-center gap-3">
             <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><MessageSquare size={17} /></span>
             <div className="min-w-0">
               <p className="truncate text-sm font-bold text-text-primary">{t("ai.title")}</p>
                <p className="truncate text-xs text-text-secondary">{t("ai.subtitle")}</p>
                {aiStatus ? (
                  aiStatus.configured ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      {t("ai.connected_gemini", { model: aiStatus.model })}
                    </p>
                  ) : (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-warning">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      {t("ai.not_connected_gemini")}
                    </p>
                  )
                ) : null}
             </div>
           </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost !min-h-[40px] !min-w-[40px] !px-2.5"
              aria-label={t("common.close")}
            >
              <X size={17} />
            </button>

         </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background p-4">
            {messages.length ? (
              <div className="grid gap-2.5">
                {messages.map((message, index) => (
                  <div
                    key={message._id || `${message.role}-${index}`}
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                       message.role === "user"
                         ? "ml-auto bg-secondary text-white"
                         : "border border-border bg-surface text-text-primary"
                    }`}
                  >
                     <MessageContent content={message.content} />
                  </div>
                ))}
                {loading ? (
                  <div className="flex items-center gap-2" role="status" aria-label={t("common.loading")}>
                    <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-2.5" aria-hidden="true">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" style={{ animationDelay: `${d * 180}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs text-text-muted">{t("common.loading")}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-3">
                <EmptyState
                   title={t("ai.empty_title")}
                   copy={t("ai.empty_desc")}
                />
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("ai.suggestion_label")}</p>
                  <div className="grid gap-2">
                    {[t("ai.suggestion_1"), t("ai.suggestion_2"), t("ai.suggestion_3")].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={loading}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="btn-ghost justify-start !min-h-[44px] text-left !text-[13px]"
                      >
                        <Sparkles size={14} className="shrink-0 text-primary" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {context ? (
            <p className="border-t border-border bg-surface px-4 py-2 text-[11px] font-medium text-text-muted">
              {context?.curriculum?.subjects?.length || context?.forgeContext?.subjects?.length
                ? t("ai.context_subjects", { count: context?.curriculum?.subjects?.length ?? context?.forgeContext?.subjects?.length ?? 0 })
                : t("ai.context_none")}
            </p>
          ) : null}
          {error ? <p className="alert alert-error !rounded-none border-x-0 text-xs" role="alert">{error}</p> : null}

          <form onSubmit={handleSubmit} className="border-t border-border bg-surface p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("ai.placeholder")}
                className="field flex-1"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-3.5" aria-label={t("ai.send")}>
                <Send size={17} />
              </button>

           </div>
         </form>
      </aside>
    </>
  );
}
