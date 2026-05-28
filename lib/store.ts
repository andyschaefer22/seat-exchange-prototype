"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InventoryBlock, LineItem } from "./data";
import { uid } from "./utils";

export type Role = "admin" | "sales";

export type Message = {
  id: string;
  role: "assistant" | "user";
  text?: string;
  // Inline UI rendered with this message (game cards, seat grid, block options, etc.)
  ui?: {
    kind:
      | "game-cards"
      | "seat-grid"
      | "target-game-picker"
      | "block-options"
      | "reconciliation"
      | "approval-card"
      | "limit-override"
      | "preference-chips"
      | "request-summary"
      | "executing"
      | "completed";
    data?: unknown;
  };
};

export type SeatExchangeFlow = {
  step:
    | "idle"
    | "choose-source-game"
    | "choose-seats"
    | "choose-target-game"
    | "choose-block"
    | "reconciliation"
    | "approval"
    | "executing"
    | "done"
    | "sales-preferences"
    | "sales-note"
    | "sales-summary";
  fanId?: string;
  sourceEventId?: string;
  sourceSeatIds?: string[];
  targetEventId?: string;
  chosenBlockId?: string;
  reconciliation?: "charge" | "reprice" | "leave-overpaid";
  preferences?: string;
  note?: string;
  reviewingNotificationId?: string;
};

export type Notification = {
  id: string;
  forRole: Role;
  kind: "request-pending" | "request-executed" | "request-rejected";
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  stagedRequestId?: string;
};

export type StagedRequest = {
  id: string;
  fanId: string;
  requestedBy: string; // sales user name
  sourceEventId: string;
  sourceSeatIds: string[];
  preferences: string;
  note: string;
  status: "pending" | "executed" | "rejected";
  rejectReason?: string;
  createdAt: number;
  // Filled in by admin during review:
  executedTargetBlock?: InventoryBlock;
};

type StoreState = {
  // role
  currentRole: Role;
  setRole: (r: Role) => void;

  // chat
  chatOpen: boolean;
  contextPage: { kind: "order" | "fan" | "none"; orderId?: string; fanId?: string };
  conversation: Message[];
  flow: SeatExchangeFlow;
  setContextPage: (ctx: StoreState["contextPage"]) => void;
  openChat: () => void;
  closeChat: () => void;
  appendMessage: (m: Omit<Message, "id">) => void;
  setFlow: (patch: Partial<SeatExchangeFlow>) => void;
  resetFlow: () => void;
  clearConversation: () => void;

  // notifications & staged requests (persisted)
  notifications: Notification[];
  stagedRequests: StagedRequest[];
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => Notification;
  markNotificationRead: (id: string) => void;
  createStagedRequest: (r: Omit<StagedRequest, "id" | "createdAt" | "status">) => StagedRequest;
  updateStagedRequest: (id: string, patch: Partial<StagedRequest>) => void;

  // line-item status overrides (so executed exchanges show on the order page)
  lineItemStatusOverrides: Record<string, LineItem["status"]>;
  addedLineItems: LineItem[];
  applyExchange: (removedSeatIds: string[], added: LineItem[]) => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentRole: "admin",
      setRole: (r) => {
        set({ currentRole: r });
        // reset transient chat state when role changes
        set({ chatOpen: false, conversation: [], flow: { step: "idle" } });
      },

      chatOpen: false,
      contextPage: { kind: "none" },
      conversation: [],
      flow: { step: "idle" },
      setContextPage: (ctx) => set({ contextPage: ctx }),
      openChat: () => set({ chatOpen: true }),
      closeChat: () => set({ chatOpen: false }),
      appendMessage: (m) =>
        set((s) => ({ conversation: [...s.conversation, { ...m, id: uid("msg") }] })),
      setFlow: (patch) => set((s) => ({ flow: { ...s.flow, ...patch } })),
      resetFlow: () => set({ flow: { step: "idle" } }),
      clearConversation: () => set({ conversation: [], flow: { step: "idle" } }),

      notifications: [],
      stagedRequests: [],
      addNotification: (n) => {
        const full: Notification = { ...n, id: uid("n"), createdAt: Date.now(), read: false };
        set((s) => ({ notifications: [full, ...s.notifications] }));
        return full;
      },
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      createStagedRequest: (r) => {
        const full: StagedRequest = { ...r, id: uid("sr"), createdAt: Date.now(), status: "pending" };
        set((s) => ({ stagedRequests: [full, ...s.stagedRequests] }));
        return full;
      },
      updateStagedRequest: (id, patch) =>
        set((s) => ({
          stagedRequests: s.stagedRequests.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      lineItemStatusOverrides: {},
      addedLineItems: [],
      applyExchange: (removedSeatIds, added) =>
        set((s) => {
          const overrides = { ...s.lineItemStatusOverrides };
          for (const sid of removedSeatIds) overrides[sid] = "Exchanged";
          return {
            lineItemStatusOverrides: overrides,
            addedLineItems: [...s.addedLineItems, ...added],
          };
        }),
    }),
    {
      name: "sxa-prototype-v1",
      partialize: (s) => ({
        currentRole: s.currentRole,
        notifications: s.notifications,
        stagedRequests: s.stagedRequests,
        lineItemStatusOverrides: s.lineItemStatusOverrides,
        addedLineItems: s.addedLineItems,
      }),
    },
  ),
);

export function unreadCountForRole(notifications: Notification[], role: Role): number {
  return notifications.filter((n) => n.forRole === role && !n.read).length;
}
