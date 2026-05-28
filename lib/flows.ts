// Scripted AI Assist flow controllers. Pure functions that drive store updates.

import { FANS_BY_ID, ORDERS, ORDERS_BY_ID, ALL_EVENTS, getBlockOptions } from "./data";
import type { InventoryBlock } from "./data";
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

// Keyword aliases used to recognize a game from free-form text. The data layer
// stores shortTitle as e.g. "Cavaliers", but reps commonly type "Cavs".
const EVENT_KEYWORDS: { keyword: string; eventId: string }[] = [
  { keyword: "cavaliers", eventId: "e_cavs" },
  { keyword: "cavs", eventId: "e_cavs" },
  { keyword: "hawks", eventId: "e_hawks" },
  { keyword: "warriors", eventId: "e_warriors" },
  { keyword: "lakers", eventId: "e_lakers" },
  { keyword: "nuggets", eventId: "e_nuggets" },
];

// Parse a free-form sales prompt into the entities the button-driven flow would
// otherwise ask for. Conservative by design: anything ambiguous is left
// undefined so the flow falls back to asking the question.
export function salesParseIntent(text: string): {
  detectedFanId?: string;
  detectedSourceEventId?: string;
  detectedTargetEventId?: string;
  isExchangeIntent: boolean;
} {
  const lower = text.toLowerCase();
  const isExchangeIntent = /\b(exchange|swap|switch|trade|move)\b/.test(lower);

  // Fan: only accept a match when exactly one known first name appears.
  const matchedFanIds = new Set<string>();
  for (const fan of Object.values(FANS_BY_ID)) {
    const first = fan.name.split(" ")[0].toLowerCase();
    if (new RegExp(`\\b${first}\\b`).test(lower)) matchedFanIds.add(fan.id);
  }
  const detectedFanId = matchedFanIds.size === 1 ? [...matchedFanIds][0] : undefined;

  // Events: earliest keyword hit per event, in order of appearance.
  const eventHits: { eventId: string; index: number }[] = [];
  const seenEvents = new Set<string>();
  for (const { keyword, eventId } of EVENT_KEYWORDS) {
    if (seenEvents.has(eventId)) continue;
    const index = lower.search(new RegExp(`\\b${keyword}\\b`));
    if (index !== -1) {
      eventHits.push({ eventId, index });
      seenEvents.add(eventId);
    }
  }
  eventHits.sort((a, b) => a.index - b.index);

  let detectedSourceEventId: string | undefined;
  let detectedTargetEventId: string | undefined;

  // "for"/"into" marks the boundary: games before it are the source to exchange
  // FROM, games after it are the target to exchange INTO.
  const prep = lower.match(/\b(for|into)\b/);
  const prepIndex = prep?.index ?? -1;

  if (prepIndex >= 0) {
    const before = eventHits.filter((e) => e.index < prepIndex);
    const after = eventHits.filter((e) => e.index > prepIndex);
    if (before.length === 1) detectedSourceEventId = before[0].eventId;
    if (after.length >= 1) detectedTargetEventId = after[0].eventId;
  } else if (eventHits.length === 1) {
    // No preposition to disambiguate. Only treat the lone game as the source
    // when there's an explicit source cue ("Cavs seats" / "from the Cavs");
    // otherwise leave it unset and let the flow ask.
    const e = eventHits[0];
    const tail = lower.slice(e.index, e.index + 40);
    const head = lower.slice(Math.max(0, e.index - 12), e.index);
    if (/\bseats?\b/.test(tail) || /\bfrom\b/.test(head)) {
      detectedSourceEventId = e.eventId;
    }
  }

  return { detectedFanId, detectedSourceEventId, detectedTargetEventId, isExchangeIntent };
}

type SalesKnown = {
  fanId?: string;
  sourceEventId?: string;
  sourceSeatIds?: string[];
  targetEventId?: string;
  preferences?: string;
  chosenBlockId?: string;
  reconciliation?: "charge" | "reprice" | "leave-overpaid";
  note?: string;
};

function salesKnownFromFlow(flow: SeatExchangeFlow): SalesKnown {
  return {
    fanId: flow.fanId,
    sourceEventId: flow.sourceEventId,
    sourceSeatIds: flow.sourceSeatIds,
    targetEventId: flow.targetEventId,
    preferences: flow.preferences,
    chosenBlockId: flow.chosenBlockId,
    reconciliation: flow.reconciliation,
    note: flow.note,
  };
}

// Resolves the chosen comparable block and its price delta from the current
// selection. getBlockOptions is deterministic, so the block can always be
// reconstructed from fan + source seats + target game + chosenBlockId.
export function salesResolveBlock(known: {
  fanId?: string;
  sourceSeatIds?: string[];
  targetEventId?: string;
  chosenBlockId?: string;
}): { block: InventoryBlock; delta: number } | null {
  if (!known.fanId || !known.targetEventId || !known.chosenBlockId) return null;
  const order = ORDERS.find((o) => o.fanId === known.fanId);
  const sourceSeats =
    order?.lineItems.filter((li) => known.sourceSeatIds?.includes(li.id)) ?? [];
  const count = Math.max(1, sourceSeats.length);
  const refPrice = sourceSeats[0]?.price ?? 10;
  const block = getBlockOptions(known.targetEventId, refPrice, count).find(
    (b) => b.id === known.chosenBlockId,
  );
  if (!block) return null;
  const sourceTotal = sourceSeats.reduce((s, li) => s + li.price, 0);
  const delta = block.pricePerSeat * count - sourceTotal;
  return { block, delta };
}

// Renders the final review summary and clears any in-progress edit state.
function showSalesSummary(
  appendMessage: AppendMessage,
  setFlow: SetFlow,
  opts?: { edited?: boolean },
) {
  appendMessage({
    role: "assistant",
    text: opts?.edited
      ? "Updated. Here's the revised request — confirm to route it to Ticket Ops."
      : "Here's the request I'll send to Ticket Ops. Confirm to route it for approval and execution.",
    ui: { kind: "request-summary" },
  });
  setFlow({ step: "sales-summary", editing: false });
}

// Drives the sales intake: asks only the first unanswered question in the
// button-driven order (fan → source game → seats → target game → preferences →
// note → summary). Anything already known (e.g. parsed from the prompt) is
// skipped.
export function salesAdvance(
  known: SalesKnown,
  appendMessage: AppendMessage,
  setFlow: SetFlow,
) {
  // 1. Which fan
  if (!known.fanId) {
    appendMessage({
      role: "assistant",
      text: "Which fan is this for? (e.g., Andy, Brandon, Jessica)",
    });
    setFlow({ step: "sales-need-fan" });
    return;
  }
  const fan = FANS_BY_ID[known.fanId];
  const order = ORDERS.find((o) => o.fanId === fan.id);
  if (!order) {
    appendMessage({ role: "assistant", text: `I couldn't find an order for ${fan.name}.` });
    setFlow({ step: "idle" });
    return;
  }
  const fanEventIds = [...new Set(order.lineItems.map((li) => li.eventId))];

  // 2. Which game to exchange from. Skip if the rep has inventory in only one
  // game, or if a valid source was parsed.
  if (!known.sourceEventId || !fanEventIds.includes(known.sourceEventId)) {
    if (fanEventIds.length === 1) {
      known.sourceEventId = fanEventIds[0];
      setFlow({ sourceEventId: fanEventIds[0] });
    } else {
      appendMessage({
        role: "assistant",
        text: `Which game would you like to exchange ${fan.name.split(" ")[0]}'s seats from?`,
        ui: { kind: "game-cards", data: { eventIds: fanEventIds, fanId: fan.id, salesMode: true } },
      });
      setFlow({ step: "sales-source-game", fanId: fan.id });
      return;
    }
  }

  // 3. Which seats
  if (!known.sourceSeatIds || known.sourceSeatIds.length === 0) {
    const ev = ALL_EVENTS[known.sourceEventId];
    appendMessage({
      role: "assistant",
      text: `Which of ${fan.name.split(" ")[0]}'s seats from ${ev?.title} should be exchanged?`,
      ui: { kind: "seat-grid", data: { eventId: known.sourceEventId, fanId: fan.id, salesMode: true } },
    });
    setFlow({ step: "choose-seats", fanId: fan.id, sourceEventId: known.sourceEventId });
    return;
  }

  // 4. Target game to exchange into
  if (!known.targetEventId) {
    appendMessage({
      role: "assistant",
      text: "Which game would you like to exchange these seats into?",
      ui: { kind: "target-game-picker", data: { salesMode: true } },
    });
    setFlow({ step: "sales-target-game" });
    return;
  }

  // 5. Preferences
  if (known.preferences === undefined) {
    appendMessage({
      role: "assistant",
      text: "Any preferences for the new seats? (e.g., closer to court, same price, sit together)",
      ui: { kind: "preference-chips" },
    });
    setFlow({ step: "sales-preferences" });
    return;
  }

  // 6. Target seat block — Sales picks the actual comparable block (same depth
  // as the Admin's direct flow).
  if (!known.chosenBlockId) {
    const targetEvent = ALL_EVENTS[known.targetEventId!];
    appendMessage({
      role: "assistant",
      text: `Here are comparable seat block options for ${targetEvent?.title}. Select the one to exchange into.`,
      ui: { kind: "block-options", data: { targetEventId: known.targetEventId, salesMode: true } },
    });
    setFlow({ step: "sales-block" });
    return;
  }

  // 7. Reconciliation — only when the chosen block has a price delta.
  const resolved = salesResolveBlock(known);
  if (resolved && resolved.delta !== 0 && known.reconciliation === undefined) {
    appendMessage({
      role: "assistant",
      text: `There's a price delta of ${resolved.delta > 0 ? "+" : "−"}$${Math.abs(
        resolved.delta,
      ).toFixed(2)} on that block. How should we reconcile?`,
      ui: { kind: "reconciliation", data: { priceDelta: resolved.delta, salesMode: true } },
    });
    setFlow({ step: "sales-reconciliation" });
    return;
  }

  // 8. Optional note for Ticket Ops — Submit / Add Comments buttons.
  if (known.note === undefined) {
    appendMessage({
      role: "assistant",
      text: "Any context to share with Ticket Ops? (optional)",
      ui: { kind: "note-actions" },
    });
    setFlow({ step: "sales-note" });
    return;
  }

  // Done — show the summary to confirm and route.
  showSalesSummary(appendMessage, setFlow);
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
  const parsed = salesParseIntent(userText);
  appendMessage({ role: "user", text: userText });

  const hasEntity =
    parsed.detectedFanId || parsed.detectedSourceEventId || parsed.detectedTargetEventId;
  if (!parsed.isExchangeIntent && !hasEntity) {
    appendMessage({
      role: "assistant",
      text: "I can help route a request to Ticket Ops. Could you describe what you'd like? (e.g., \"exchange Andy's Cavs seats for the Hawks game\")",
    });
    return;
  }

  // Drop a parsed source that the fan has no inventory in (defensive — the flow
  // will then ask or auto-resolve it).
  let sourceEventId = parsed.detectedSourceEventId;
  if (parsed.detectedFanId && sourceEventId) {
    const order = ORDERS.find((o) => o.fanId === parsed.detectedFanId);
    if (!order?.lineItems.some((li) => li.eventId === sourceEventId)) sourceEventId = undefined;
  }

  // Fresh start: reset any stale fields from a prior request.
  setFlow({
    step: "idle",
    fanId: parsed.detectedFanId,
    sourceEventId,
    sourceSeatIds: undefined,
    targetEventId: parsed.detectedTargetEventId,
    preferences: undefined,
    note: undefined,
    chosenBlockId: undefined,
    reconciliation: undefined,
    reviewingNotificationId: undefined,
  });

  salesAdvance(
    {
      fanId: parsed.detectedFanId,
      sourceEventId,
      targetEventId: parsed.detectedTargetEventId,
    },
    appendMessage,
    setFlow,
  );
}

export function salesProvideFan({
  userText,
  flow,
  appendMessage,
  setFlow,
}: {
  userText: string;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const parsed = salesParseIntent(userText);
  appendMessage({ role: "user", text: userText });
  if (!parsed.detectedFanId) {
    appendMessage({
      role: "assistant",
      text: "I didn't catch which fan. Please say Andy, Brandon, or Jessica.",
    });
    return;
  }
  const known = salesKnownFromFlow(flow);
  known.fanId = parsed.detectedFanId;
  setFlow({ fanId: parsed.detectedFanId });
  // The fan reply may also mention games — merge anything not already known.
  if (!known.sourceEventId && parsed.detectedSourceEventId) {
    known.sourceEventId = parsed.detectedSourceEventId;
    setFlow({ sourceEventId: parsed.detectedSourceEventId });
  }
  if (!known.targetEventId && parsed.detectedTargetEventId) {
    known.targetEventId = parsed.detectedTargetEventId;
    setFlow({ targetEventId: parsed.detectedTargetEventId });
  }
  salesAdvance(known, appendMessage, setFlow);
}

export function salesPickSourceGame({
  eventId,
  fanId,
  flow,
  appendMessage,
  setFlow,
}: {
  eventId: string;
  fanId: string;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const ev = ALL_EVENTS[eventId];
  appendMessage({ role: "user", text: ev?.title ?? eventId });
  setFlow({ sourceEventId: eventId });
  const known = salesKnownFromFlow(flow);
  known.fanId = fanId;
  known.sourceEventId = eventId;
  salesAdvance(known, appendMessage, setFlow);
}

export function salesPickTargetGame({
  targetEventId,
  flow,
  appendMessage,
  setFlow,
}: {
  targetEventId: string;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const ev = ALL_EVENTS[targetEventId];
  appendMessage({ role: "user", text: ev?.title ?? targetEventId });
  setFlow({ targetEventId });
  const known = salesKnownFromFlow(flow);
  known.targetEventId = targetEventId;
  salesAdvance(known, appendMessage, setFlow);
}

export function salesAfterSeats({
  seatIds,
  flow,
  appendMessage,
  setFlow,
}: {
  seatIds: string[];
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: `Selected ${seatIds.length} seat${seatIds.length === 1 ? "" : "s"}.` });
  setFlow({ sourceSeatIds: seatIds });
  if (flow.editing) {
    showSalesSummary(appendMessage, setFlow, { edited: true });
    return;
  }
  const known = salesKnownFromFlow(flow);
  known.sourceSeatIds = seatIds;
  salesAdvance(known, appendMessage, setFlow);
}

export function salesAskSpecificSeats({
  appendMessage,
  setFlow,
}: {
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Specific seat location" });
  appendMessage({
    role: "assistant",
    text: "Got it — please specify the section, row, and seat numbers you'd like.",
  });
  setFlow({ step: "sales-preferences-specific" });
}

export function salesAfterPreferences({
  preferences,
  flow,
  appendMessage,
  setFlow,
}: {
  preferences: string;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: preferences });
  setFlow({ preferences });
  if (flow.editing) {
    showSalesSummary(appendMessage, setFlow, { edited: true });
    return;
  }
  const known = salesKnownFromFlow(flow);
  known.preferences = preferences;
  salesAdvance(known, appendMessage, setFlow);
}

export function salesPickBlock({
  blockId,
  flow,
  appendMessage,
  setFlow,
}: {
  blockId: string;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  const known = salesKnownFromFlow(flow);
  known.chosenBlockId = blockId;
  // Picking a (different) block invalidates any prior reconciliation choice.
  known.reconciliation = undefined;
  const resolved = salesResolveBlock(known);
  appendMessage({
    role: "user",
    text: resolved
      ? `Section ${resolved.block.section} · Row ${resolved.block.row} · Seats ${resolved.block.seats}`
      : "Selected that block.",
  });
  setFlow({ chosenBlockId: blockId, reconciliation: undefined, priceDelta: resolved?.delta });
  salesAdvance(known, appendMessage, setFlow);
}

export function salesPickReconciliation({
  option,
  flow,
  appendMessage,
  setFlow,
}: {
  option: "charge" | "reprice" | "leave-overpaid";
  flow: SeatExchangeFlow;
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
  setFlow({ reconciliation: option });
  const known = salesKnownFromFlow(flow);
  known.reconciliation = option;
  salesAdvance(known, appendMessage, setFlow);
}

// "Submit" on the note step — proceed straight to the request summary. A note
// left empty stays undefined and renders as "—".
export function salesSubmitNote({
  flow,
  appendMessage,
  setFlow,
}: {
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Submit" });
  showSalesSummary(appendMessage, setFlow, { edited: !!flow.editing });
}

// "Add Comments" on the note step — re-enable the chat input for a comment.
export function salesStartComment({
  appendMessage,
  setFlow,
}: {
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Add Comments" });
  appendMessage({
    role: "assistant",
    text: "Type your comment below and press Enter.",
  });
  setFlow({ step: "sales-note-comment" });
}

// A submitted comment — appended to the note (multiple comments joined by line
// breaks) — then re-present the Submit / Add Comments buttons.
export function salesAddComment({
  text,
  flow,
  appendMessage,
  setFlow,
}: {
  text: string;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text });
  const note = flow.note ? `${flow.note}\n${text}` : text;
  setFlow({ note });
  appendMessage({
    role: "assistant",
    text: "Comment added. Add more, or submit the request.",
    ui: { kind: "note-actions" },
  });
  setFlow({ step: "sales-note" });
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

// ----- Sales summary editing -----

export type SalesEditField = "fan" | "source" | "seats" | "preferences" | "note";

export const SALES_EDIT_LABELS: Record<SalesEditField, string> = {
  fan: "Fan",
  source: "Game to exchange from",
  seats: "Exchanged seats",
  preferences: "Preferences",
  note: "Note",
};

// Returns the fields that are actually present in the request, in flow order.
export function salesEditableFields(flow: SeatExchangeFlow): SalesEditField[] {
  const fields: SalesEditField[] = [];
  if (flow.fanId) fields.push("fan");
  if (flow.sourceEventId) fields.push("source");
  if (flow.sourceSeatIds && flow.sourceSeatIds.length > 0) fields.push("seats");
  if (flow.preferences) fields.push("preferences");
  if (flow.note) fields.push("note");
  return fields;
}

// Opens the "what would you like to edit?" menu from the summary card.
export function openSalesEditMenu({
  appendMessage,
  setFlow,
}: {
  appendMessage: AppendMessage;
  setFlow: SetFlow;
}) {
  appendMessage({ role: "user", text: "Edit" });
  appendMessage({
    role: "assistant",
    text: "What would you like to edit?",
    ui: { kind: "edit-menu" },
  });
  setFlow({ step: "sales-edit-menu" });
}

// Routes back to a single step to revise one field, then returns to the summary.
export function salesEditField({
  field,
  flow,
  appendMessage,
  setFlow,
  setDraftInput,
}: {
  field: SalesEditField;
  flow: SeatExchangeFlow;
  appendMessage: AppendMessage;
  setFlow: SetFlow;
  setDraftInput: (v: string) => void;
}) {
  appendMessage({ role: "user", text: SALES_EDIT_LABELS[field] });

  switch (field) {
    case "note": {
      appendMessage({
        role: "assistant",
        text: "Any context to share with Ticket Ops? (optional)",
        ui: { kind: "note-actions" },
      });
      setFlow({ step: "sales-note", editing: true });
      return;
    }
    case "preferences": {
      appendMessage({
        role: "assistant",
        text: "Any preferences for the new seats? (e.g., closer to court, same price, sit together)",
        ui: { kind: "preference-chips" },
      });
      setFlow({ step: "sales-preferences", editing: true });
      return;
    }
    case "seats": {
      if (!flow.fanId || !flow.sourceEventId) return;
      const fan = FANS_BY_ID[flow.fanId];
      const ev = ALL_EVENTS[flow.sourceEventId];
      // New seats change the comparable-block pricing — re-pick block + reconciliation.
      setFlow({
        editing: false,
        chosenBlockId: undefined,
        reconciliation: undefined,
        priceDelta: undefined,
      });
      appendMessage({
        role: "assistant",
        text: `Which of ${fan.name.split(" ")[0]}'s seats from ${ev?.title} should be exchanged?`,
        ui: { kind: "seat-grid", data: { eventId: flow.sourceEventId, fanId: flow.fanId, salesMode: true } },
      });
      setFlow({ step: "choose-seats" });
      return;
    }
    case "source": {
      // Changing the source game invalidates seats + chosen block — clear and
      // let the flow re-ask those steps before returning to the summary.
      setFlow({
        editing: false,
        sourceEventId: undefined,
        sourceSeatIds: undefined,
        chosenBlockId: undefined,
        reconciliation: undefined,
        priceDelta: undefined,
      });
      const known = salesKnownFromFlow(flow);
      known.sourceEventId = undefined;
      known.sourceSeatIds = undefined;
      known.chosenBlockId = undefined;
      known.reconciliation = undefined;
      salesAdvance(known, appendMessage, setFlow);
      return;
    }
    case "fan": {
      // Changing the fan invalidates source + seats + chosen block.
      const draftName = flow.fanId ? FANS_BY_ID[flow.fanId].name.split(" ")[0] : "";
      setFlow({
        editing: false,
        fanId: undefined,
        sourceEventId: undefined,
        sourceSeatIds: undefined,
        chosenBlockId: undefined,
        reconciliation: undefined,
        priceDelta: undefined,
      });
      const known = salesKnownFromFlow(flow);
      known.fanId = undefined;
      known.sourceEventId = undefined;
      known.sourceSeatIds = undefined;
      known.chosenBlockId = undefined;
      known.reconciliation = undefined;
      salesAdvance(known, appendMessage, setFlow);
      if (draftName) setDraftInput(draftName);
      return;
    }
  }
}

// Note: Sales-routed requests are NOT reviewed through AI Assist. The Sales rep
// captures the full request (incl. target block + reconciliation) and the Admin
// executes it directly from the notification card. See NotificationItem.

export function getOrderForFan(fanId: string) {
  return ORDERS.find((o) => o.fanId === fanId);
}

export function getOrderById(id: string) {
  return ORDERS_BY_ID[id];
}
