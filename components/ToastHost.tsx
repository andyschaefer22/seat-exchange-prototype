"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { create } from "zustand";
import { uid } from "@/lib/utils";

type Toast = { id: string; title: string; body?: string; action?: { label: string; onClick: () => void } };

type ToastStore = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
};

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid("t");
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto w-[340px] bg-white border border-[color:var(--color-border)] rounded-lg shadow-lg p-3"
          >
            <ToastBody t={t} onClose={() => dismiss(t.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastBody({ t, onClose }: { t: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div>
      <div className="font-medium text-[13px] text-[color:var(--color-base-text)]">{t.title}</div>
      {t.body && <div className="text-[12px] text-[color:var(--color-base-shade-300)] mt-0.5">{t.body}</div>}
      {t.action && (
        <button
          onClick={() => {
            t.action!.onClick();
            onClose();
          }}
          className="mt-2 text-[12px] font-semibold text-[color:var(--color-primary)] hover:underline"
        >
          {t.action.label} →
        </button>
      )}
    </div>
  );
}
