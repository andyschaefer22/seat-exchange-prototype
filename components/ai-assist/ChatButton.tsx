"use client";

import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";

export function ChatButton() {
  const open = useStore((s) => s.chatOpen);
  const openChat = useStore((s) => s.openChat);
  if (open) return null;
  return (
    <button
      onClick={openChat}
      aria-label="Open AI Assist"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg grid place-items-center text-white hover:scale-105 transition-transform"
      style={{
        background:
          "linear-gradient(135deg, #4c2ffe 0%, #6f4dff 50%, #a293fb 100%)",
        boxShadow: "0 8px 24px rgba(76, 47, 254, 0.4)",
      }}
    >
      <Sparkles size={22} />
    </button>
  );
}
