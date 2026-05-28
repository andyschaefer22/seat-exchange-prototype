"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
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
            className="pointer-events-auto w-[340px] bg-white border border-[color:var(--color-border)] rounded-lg shadow-lg overflow-hidden"
          >
            <ToastBody t={t} dismiss={dismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const TOAST_DURATION = 8000;

function ToastBody({ t, dismiss }: { t: Toast; dismiss: (id: string) => void }) {
  // Stable across re-renders (e.g. when another toast is pushed) so timers for
  // existing toasts aren't reset.
  const onClose = useCallback(() => dismiss(t.id), [dismiss, t.id]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(TOAST_DURATION);
  const startRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      startRef.current = Date.now();
      timerRef.current = setTimeout(onClose, ms);
    },
    [clearTimer, onClose],
  );

  // Auto-dismiss fallback — runs once per toast.
  useEffect(() => {
    startTimer(TOAST_DURATION);
    return clearTimer;
  }, [startTimer, clearTimer]);

  // Pause on hover, resume with the remaining time on leave.
  const pause = () => {
    if (timerRef.current) {
      remainingRef.current -= Date.now() - startRef.current;
      clearTimer();
    }
  };
  const resume = () => {
    startTimer(Math.max(0, remainingRef.current));
  };

  return (
    <div className="relative p-3" onMouseEnter={pause} onMouseLeave={resume}>
      <button
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute top-2 right-2 text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)]"
      >
        <X size={14} />
      </button>
      <div className="font-medium text-[13px] text-[color:var(--color-base-text)] pr-6">
        {t.title}
        {t.action && (
          <>
            <span className="text-[color:var(--color-base-shade-300)]"> · </span>
            <button
              onClick={() => {
                t.action!.onClick();
                onClose();
              }}
              className="font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              {t.action.label}
            </button>
          </>
        )}
      </div>
      {t.body && <div className="text-[12px] text-[color:var(--color-base-shade-300)] mt-0.5 pr-6">{t.body}</div>}
    </div>
  );
}
