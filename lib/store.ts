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
      | "edit-menu"
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
    | "sales-need-fan"
    | "sales-source-game"
    | "sales-target-game"
    | "sales-preferences"
    | "sales-preferences-specific"
    | "sales-block"
    | "sales-reconciliation"
    | "sales-note"
    | "sales-edit-menu"
    | "sales-summary";
  fanId?: string;
  sourceEventId?: string;
  sourceSeatIds?: string[];
  targetEventId?: string;
  chosenBlockId?: string;
  reconciliation?: "charge" | "reprice" | "leave-overpaid";
  priceDelta?: number;
  preferences?: string;
  note?: string;
  reviewingNotificationId?: string;
  // True while editing a single field from the summary — handlers return
  // straight to the summary instead of advancing through the rest of the flow.
  editing?: boolean;
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
  targetEventId?: string; // game the sales rep requested to exchange into
  // The complete target selection the Sales rep made — everything Admin needs to
  // execute without any further input.
  targetBlock?: InventoryBlock; // the comparable seat block the Sales rep chose
  reconciliation?: "charge" | "reprice" | "leave-overpaid"; // chosen iff price delta
  priceDelta?: number; // delta on the chosen block (0 when prices match)
  preferences: string;
  note: string;
  status: "pending" | "executed" | "rejected" | "cancelled";
  rejectReason?: string;
  createdAt: number;
};

type StoreState = {
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

  // One-shot pre-fill for the chat input (used when editing the note/fan fields).
  draftInput: string;
  setDraftInput: (v: string) => void;

  // notifications & staged requests (in-memory only)
  notifications: Notification[];
  stagedRequests: StagedRequest[];
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => Notification;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  createStagedRequest: (r: Omit<StagedRequest, "id" | "createdAt" | "status">) => StagedRequest;
  updateStagedRequest: (id: string, patch: Partial<StagedRequest>) => void;

  // line-item status overrides (so executed exchanges show on the order page)
  lineItemStatusOverrides: Record<string, LineItem["status"]>;
  addedLineItems: LineItem[];
  applyExchange: (removedSeatIds: string[], added: LineItem[]) => void;
};

// Purge legacy persisted blobs from earlier versions that stored the FULL app
// state (notifications, staged requests, etc.). Without this, a browser that
// still has the old key could appear to "survive" a refresh. Nothing reads
// these keys anymore — this just removes the stale data.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("sxa-prototype-v1");
    window.localStorage.removeItem("sxa-prototype-v2");
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Role store — the ONLY persisted state in the app. Isolated in its own store
// so nothing else can accidentally be persisted. Everything in useStore below
// is in-memory only and resets on every page refresh.
// ---------------------------------------------------------------------------
type RoleState = {
  currentRole: Role;
  setRole: (r: Role) => void;
};

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      currentRole: "admin",
      setRole: (r) => {
        set({ currentRole: r });
        // Reset transient chat state in the main store when the role changes.
        useStore.setState({ chatOpen: false, conversation: [], flow: { step: "idle" } });
      },
    }),
    { name: "sxa-role" },
  ),
);

// ---------------------------------------------------------------------------
// Main app store — NOT persisted. Notifications, staged requests, conversation,
// flow, and line-item overrides all start empty on every load.
// ---------------------------------------------------------------------------
export const useStore = create<StoreState>()(
    (set) => ({
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

      draftInput: "",
      setDraftInput: (v) => set({ draftInput: v }),

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
      removeNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
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
);

export function unreadCountForRole(notifications: Notification[], role: Role): number {
  return notifications.filter((n) => n.forRole === role && !n.read).length;
}
