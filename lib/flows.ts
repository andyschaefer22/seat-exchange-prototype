// Scripted AI Assist flow controllers. Pure functions that drive store updates.

import { FANS_BY_ID, ORDERS, ORDERS_BY_ID, ALL_EVENTS } from "./data";
import type { Message, SeatExchangeFlow, StagedRequest } from "./store";

type AppendMessage = (m: Omit<Message, "id">) => void;
type SetFlow = (patch: Partial<SeatExchangeFlow>) => void;

export function adminGreet({
  fanName,
  appendMessage,
}: {
  fanName: string;
  appendMessage: AppendMessage;
}) {
  appendMessage({
    role: "assistant",
    text: `Hi Sarah — I see you're viewing ${fanName}'s order. How can I help?`,
  });
}

export function salesGreet({
  fanName,
  appendMessage,
}: {
  fanName: string;
  appendMessage: AppendMessage;
}) {
  appendMessage({
    role: "assistant",
    text: `Hi Marcus — I see you're viewing ${fanName}'s order. How can I help?`,
  });
}

export function startAdminExchange({
  fanId,
  appendMessage,
  setFlow,
}: {
  fanId: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const order = ORDERS.find((o) => o.fanId === fanId);
  const events = order ? [...new Set(order.lineItems.map((li) => li.eventId))] : [];
  appendMessage({
    role: "user",
    text: "Exchange seats",
  });
  appendMessage({
    role: "assistant",
    text: "Got it. Which game(s) would you like to exchange seats from?",
    ui: { kind: "game-cards", data: { eventIds: events, fanId } },
  });
  setFlow({ step: "choose-source-game", fanId });
}

export function pickSourceGame({
  eventId,
  fanId,
  appendMessage,
  setFlow,
}: {
  eventId: string;
  fanId: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const fan = FANS_BY_ID[fanId];
  const ev = ALL_EVENTS[eventId];
  appendMessage({ role: "user", text: ev?.title ?? eventId });
  appendMessage({
    role: "assistant",
    text: `Here are ${fan.name.split(" ")[0]}'s seats for ${ev?.title}. Select which ones to exchange.`,
    ui: { kind: "seat-grid", data: { eventId, fanId } },
  });
  setFlow({ step: "choose-seats", sourceEventId: eventId });
}

export function pickSourceSeats({
  seatIds,
  appendMessage,
  setFlow,
}: {
  seatIds: string[];
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: `Selected ${seatIds.length} seat${seatIds.length === 1 ? "" : "s"}.` });
  appendMessage({
    role: "assistant",
    text: "Which game would you like to exchange these seats into?",
    ui: { kind: "target-game-picker" },
  });
  setFlow({ step: "choose-target-game", sourceSeatIds: seatIds });
}

export function pickTargetGame({
  targetEventId,
  appendMessage,
  setFlow,
}: {
  targetEventId: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const ev = ALL_EVENTS[targetEventId];
  appendMessage({ role: "user", text: ev?.title ?? targetEventId });
  appendMessage({
    role: "assistant",
    text: `Here are 4 comparable seat block options for ${ev?.title}.`,
    ui: { kind: "block-options", data: { targetEventId } },
  });
  setFlow({ step: "choose-block", targetEventId });
}

export function pickBlock({
  blockId,
  priceDelta,
  appendMessage,
  setFlow,
}: {
  blockId: string;
  priceDelta: number;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Selected that block." });
  if (priceDelta === 0) {
    appendMessage({
      role: "assistant",
      text: "Prices match — no reconciliation needed. Here's the summary.",
      ui: { kind: "approval-card" },
    });
    setFlow({ step: "approval", chosenBlockId: blockId });
  } else {
    appendMessage({
      role: "assistant",
      text: `There's a price delta of ${priceDelta > 0 ? "+" : "−"}$${Math.abs(priceDelta).toFixed(2)}. How should we reconcile?`,
      ui: { kind: "reconciliation", data: { priceDelta } },
    });
    setFlow({ step: "reconciliation", chosenBlockId: blockId });
  }
}

export function pickReconciliation({
  option,
  appendMessage,
  setFlow,
}: {
  option: "charge" | "reprice" | "leave-overpaid";
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({
    role: "user",
    text:
      option === "charge"
        ? "Charge the fan"
        : option === "reprice"
          ? "Reprice to match"
          : "Leave overpaid",
  });
  appendMessage({
    role: "assistant",
    text: "Review the summary and confirm.",
    ui: { kind: "approval-card" },
  });
  setFlow({ step: "approval", reconciliation: option });
}

export function executeExchange({
  appendMessage,
  setFlow,
}: {
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Confirm & Execute" });
  appendMessage({
    role: "assistant",
    text: "Executing exchange...",
    ui: { kind: "executing" },
  });
  setFlow({ step: "executing" });
}

export function exchangeCompleted({
  fanName,
  appendMessage,
  setFlow,
}: {
  fanName: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({
    role: "assistant",
    text: `Exchange complete. ${fanName}'s seats have been updated.`,
    ui: { kind: "completed" },
  });
  setFlow({ step: "done" });
}

// ----- Sales flow -----

export function salesParseIntent(text: string): {
  detectedFanId?: string;
  detectedTargetEventId?: string;
  isExchangeIntent: boolean;
} {
  const lower = text.toLowerCase();
  const isExchangeIntent =
    /\b(exchange|swap|switch|trade|move)\b/.test(lower);

  let detectedFanId: string | undefined;
  for (const fan of Object.values(FANS_BY_ID)) {
    const first = fan.name.split(" ")[0].toLowerCase();
    if (lower.includes(first.toLowerCase())) {
      detectedFanId = fan.id;
      break;
    }
  }

  let detectedTargetEventId: string | undefined;
  for (const ev of Object.values(ALL_EVENTS)) {
    if (ev.shortTitle && lower.includes(ev.shortTitle.toLowerCase())) {
      detectedTargetEventId = ev.id;
      break;
    }
  }

  return { detectedFanId, detectedTargetEventId, isExchangeIntent };
}

export function startSalesIntake({
  userText,
  appendMessage,
  setFlow,
}: {
  userText: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const { detectedFanId, detectedTargetEventId, isExchangeIntent } = salesParseIntent(userText);
  appendMessage({ role: "user", text: userText });

  if (!isExchangeIntent) {
    appendMessage({
      role: "assistant",
      text: "I can help route a request to Ticket Ops. Could you describe what you'd like? (e.g., \"exchange Andy's Cavs seats for the Hawks game\")",
    });
    return;
  }
  if (!detectedFanId) {
    appendMessage({
      role: "assistant",
      text: "Which fan is this for? (e.g., Andy, Brandon, Jessica)",
    });
    return;
  }
  const fan = FANS_BY_ID[detectedFanId];
  const order = ORDERS.find((o) => o.fanId === fan.id);
  if (!order) {
    appendMessage({ role: "assistant", text: `I couldn't find an order for ${fan.name}.` });
    return;
  }
  const sourceEvent = order.lineItems[0]?.eventId; // first event with their inventory
  appendMessage({
    role: "assistant",
    text: `Got it. Let me gather a few details so I can route this to Ticket Ops. Which of ${fan.name.split(" ")[0]}'s seats from ${ALL_EVENTS[sourceEvent]?.title} should be exchanged?`,
    ui: { kind: "seat-grid", data: { eventId: sourceEvent, fanId: fan.id, salesMode: true } },
  });
  setFlow({
    step: "choose-seats",
    fanId: fan.id,
    sourceEventId: sourceEvent,
    targetEventId: detectedTargetEventId,
  });
}

export function salesAfterSeats({
  seatIds,
  appendMessage,
  setFlow,
}: {
  seatIds: string[];
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: `Selected ${seatIds.length} seat${seatIds.length === 1 ? "" : "s"}.` });
  appendMessage({
    role: "assistant",
    text: "Any preferences for the new seats? (e.g., closer to court, same price, sit together)",
    ui: { kind: "preference-chips" },
  });
  setFlow({ step: "sales-preferences", sourceSeatIds: seatIds });
}

export function salesAfterPreferences({
  preferences,
  appendMessage,
  setFlow,
}: {
  preferences: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: preferences });
  appendMessage({
    role: "assistant",
    text: "Any context to share with Ticket Ops? (optional)",
  });
  setFlow({ step: "sales-note", preferences });
}

export function salesAfterNote({
  note,
  appendMessage,
  setFlow,
}: {
  note: string;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: note || "(no additional context)" });
  appendMessage({
    role: "assistant",
    text: "Here's the request I'll send to Ticket Ops. Confirm to route it for approval and execution.",
    ui: { kind: "request-summary" },
  });
  setFlow({ step: "sales-summary", note });
}

export function salesSendRequest({
  appendMessage,
  setFlow,
}: {
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Send to Ticket Ops" });
  appendMessage({
    role: "assistant",
    text: "Done. Ticket Ops will review and execute. You'll be notified when it's complete.",
  });
  setFlow({ step: "done" });
}

// ----- Admin review (resume from staged request) -----

export function startAdminReviewFlow({
  req,
  appendMessage,
  setFlow,
}: {
  req: StagedRequest;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const fan = FANS_BY_ID[req.fanId];
  appendMessage({
    role: "assistant",
    text: `Reviewing exchange request from ${req.requestedBy} for ${fan.name}. ${
      req.preferences ? `Preferences: "${req.preferences}". ` : ""
    }${req.note ? `Note: "${req.note}". ` : ""}Which game would you like to exchange these seats into?`,
    ui: { kind: "target-game-picker" },
  });
  setFlow({
    step: "choose-target-game",
    fanId: req.fanId,
    sourceEventId: req.sourceEventId,
    sourceSeatIds: req.sourceSeatIds,
    reviewingNotificationId: req.id,
  });
}

export function getOrderForFan(fanId: string) {
  return ORDERS.find((o) => o.fanId === fanId);
}

export function getOrderById(id: string) {
  return ORDERS_BY_ID[id];
}
