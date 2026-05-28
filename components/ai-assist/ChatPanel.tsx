"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore, useRoleStore } from "@/lib/store";
import { FANS_BY_ID, ORDERS_BY_ID } from "@/lib/data";
import {
  adminGreet,
  salesGreet,
  startAdminExchange,
  startSalesIntake,
  salesProvideFan,
  salesAddComment,
  salesAfterPreferences,
} from "@/lib/flows";
import { MessageList } from "./MessageList";

export function ChatPanel() {
  const open = useStore((s) => s.chatOpen);
  const closeChat = useStore((s) => s.closeChat);
  const role = useRoleStore((s) => s.currentRole);
  const contextPage = useStore((s) => s.contextPage);
  const conversation = useStore((s) => s.conversation);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const flow = useStore((s) => s.flow);
  const draftInput = useStore((s) => s.draftInput);
  const setDraftInput = useStore((s) => s.setDraftInput);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The chat input is disabled at the note step (Submit / Add Comments buttons
  // drive it) and re-enabled while the user is composing a comment.
  const inputDisabled = role === "sales" && flow.step === "sales-note";

  // Consume a one-shot pre-fill (e.g. when editing the fan from the summary).
  useEffect(() => {
    if (draftInput) {
      setInput(draftInput);
      setDraftInput("");
    }
  }, [draftInput, setDraftInput]);

  // Focus the input when the user opts to add a comment.
  useEffect(() => {
    if (flow.step === "sales-note-comment") inputRef.current?.focus();
  }, [flow.step]);

  // Greet on open if empty
  useEffect(() => {
    if (!open) return;
    if (conversation.length === 0) {
      const fanId =
        contextPage.fanId ??
        (contextPage.orderId ? ORDERS_BY_ID[contextPage.orderId]?.fanId : undefined);
      const fanName = fanId ? FANS_BY_ID[fanId]?.name : undefined;
      if (fanName) {
        if (role === "admin") adminGreet({ fanName, appendMessage });
        else salesGreet({ fanName, appendMessage });
      } else {
        appendMessage({
          role: "assistant",
          text: role === "admin" ? "Hi Sarah — how can I help?" : "Hi Marcus — how can I help?",
        });
      }
    }
  }, [open, conversation.length, role, contextPage, appendMessage]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.length, flow.step]);

  const fanIdForContext =
    contextPage.fanId ??
    (contextPage.orderId ? ORDERS_BY_ID[contextPage.orderId]?.fanId : undefined);
  const fanName = fanIdForContext ? FANS_BY_ID[fanIdForContext]?.name : undefined;
  const contextLabel =
    contextPage.kind === "order" && contextPage.orderId && fanName
      ? `Viewing: ${fanName} — Order ${contextPage.orderId}`
      : contextPage.kind === "fan" && fanName
        ? `Viewing: ${fanName}`
        : "No page context";

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (role === "sales") {
      if (flow.step === "sales-need-fan") {
        salesProvideFan({ userText: text, flow, appendMessage, setFlow });
      } else if (flow.step === "sales-note-comment") {
        salesAddComment({ text, flow, appendMessage, setFlow });
      } else if (flow.step === "sales-preferences" || flow.step === "sales-preferences-specific") {
        salesAfterPreferences({ preferences: text, flow, appendMessage, setFlow });
      } else if (flow.step === "idle" || flow.step === "done") {
        startSalesIntake({ userText: text, appendMessage, setFlow });
      } else {
        // A card step (source/target game, seats, summary) expects an on-card action.
        appendMessage({ role: "user", text });
        appendMessage({
          role: "assistant",
          text: "Please use the options above to continue.",
        });
      }
    } else {
      appendMessage({ role: "user", text });
      appendMessage({
        role: "assistant",
        text: "I'll help with that. Use one of the quick actions to start a structured flow.",
      });
    }
  };

  const onQuickAction = (action: string) => {
    if (action === "Exchange seats") {
      if (!fanIdForContext) return;
      startAdminExchange({ fanId: fanIdForContext, appendMessage, setFlow });
    } else if (action === "Request seat exchange") {
      const exampleFan = fanIdForContext ? FANS_BY_ID[fanIdForContext]?.name.split(" ")[0] : "the fan";
      setInput(`${exampleFan} wants to exchange seats`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.25 }}
          className="fixed top-0 right-0 h-full w-[480px] bg-white border-l border-[color:var(--color-border)] shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="h-14 px-4 border-b border-[color:var(--color-border)] flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full grid place-items-center text-white"
              style={{
                background: "linear-gradient(135deg, #4c2ffe 0%, #6f4dff 100%)",
              }}
            >
              <Sparkles size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold">AI Assist</div>
              <div className="text-[11px] text-[color:var(--color-base-shade-300)] truncate">{contextLabel}</div>
            </div>
            <button
              aria-label="Close"
              onClick={closeChat}
              className="text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
            <MessageList />
          </div>

          {/* Quick actions */}
          {flow.step === "idle" && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {role === "admin" ? (
                <>
                  <QuickAction onClick={() => onQuickAction("Exchange seats")} label="Exchange seats" />
                  <QuickAction onClick={() => {}} label="View fan profile" />
                  <QuickAction onClick={() => {}} label="Add ticket credit" />
                  <QuickAction onClick={() => {}} label="Void entitlement" />
                </>
              ) : (
                <QuickAction onClick={() => onQuickAction("Request seat exchange")} label="Exchange Seats" />
              )}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[color:var(--color-border)] p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                disabled={inputDisabled}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder={
                  role !== "sales"
                    ? "Ask anything..."
                    : flow.step === "sales-note"
                      ? "Use the buttons above"
                      : flow.step === "sales-note-comment"
                        ? "Add a comment for Ticket Ops..."
                        : flow.step === "sales-preferences-specific"
                          ? "e.g., Section 101, Row 1, Seats 1-2"
                          : "Describe what you need (e.g., \"Andy wants to exchange Cavs seats for Hawks\")"
                }
                className="flex-1 resize-none border border-[color:var(--color-border)] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-primary)] disabled:bg-[#f1f3f6] disabled:text-[color:var(--color-base-shade-300)] disabled:cursor-not-allowed"
              />
              <button
                onClick={onSend}
                disabled={inputDisabled || !input.trim()}
                className="w-9 h-9 rounded-md bg-[color:var(--color-primary)] text-white grid place-items-center hover:bg-[color:var(--color-primary-dark)] disabled:opacity-40"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QuickAction({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] px-2.5 py-1 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
    >
      {label}
    </button>
  );
}
