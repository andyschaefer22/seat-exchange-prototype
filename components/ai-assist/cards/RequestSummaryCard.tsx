"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  ALL_EVENTS,
  FANS_BY_ID,
  ORDERS,
  USERS,
  formatEventDateTime,
} from "@/lib/data";
import { salesSendRequest, openSalesEditMenu, salesResolveBlock } from "@/lib/flows";
import { formatCurrency } from "@/lib/utils";
import { useToasts } from "@/components/ToastHost";

export function RequestSummaryCard() {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const createStagedRequest = useStore((s) => s.createStagedRequest);
  const addNotification = useStore((s) => s.addNotification);
  const clearConversation = useStore((s) => s.clearConversation);
  const pushToast = useToasts((s) => s.push);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!flow.fanId || !flow.sourceEventId) return null;
  const fan = FANS_BY_ID[flow.fanId];
  const order = ORDERS.find((o) => o.fanId === fan.id);
  const seats = order?.lineItems.filter((li) => flow.sourceSeatIds?.includes(li.id)) ?? [];
  const sourceEvent = ALL_EVENTS[flow.sourceEventId];
  const targetEvent = flow.targetEventId ? ALL_EVENTS[flow.targetEventId] : undefined;
  const disabled = flow.step !== "sales-summary";

  const resolved = salesResolveBlock(flow);
  const block = resolved?.block;
  const delta = resolved?.delta ?? 0;
  const blockTotal = block ? block.pricePerSeat * (seats.length || 1) : 0;
  const reconLabel =
    delta === 0
      ? "None — no price delta"
      : flow.reconciliation === "charge"
        ? `Charge the fan (+${formatCurrency(Math.abs(delta))})`
        : flow.reconciliation === "reprice"
          ? "Reprice to match"
          : flow.reconciliation === "leave-overpaid"
            ? `Leave overpaid (+${formatCurrency(Math.abs(delta))} balance)`
            : "—";

  const onSend = () => {
    if (!flow.fanId || !flow.sourceEventId || !flow.sourceSeatIds) return;
    const sr = createStagedRequest({
      fanId: flow.fanId,
      requestedBy: `${USERS.sales.name} (Sales)`,
      sourceEventId: flow.sourceEventId,
      sourceSeatIds: flow.sourceSeatIds,
      targetEventId: flow.targetEventId,
      targetBlock: block,
      reconciliation: delta === 0 ? undefined : flow.reconciliation,
      priceDelta: delta,
      preferences: flow.preferences ?? "",
      note: flow.note ?? "",
    });
    addNotification({
      forRole: "admin",
      kind: "request-pending",
      title: `New exchange request from ${USERS.sales.name} for ${fan.name}`,
      body: `${seats.length} seats from ${sourceEvent?.title}${targetEvent ? ` into ${targetEvent.title}` : ""}. Preferences: ${flow.preferences || "none"}`,
      stagedRequestId: sr.id,
    });
    // Mirror to sales side as pending
    addNotification({
      forRole: "sales",
      kind: "request-pending",
      title: `Request submitted for ${fan.name}`,
      body: `Pending review by Ticket Ops.`,
      stagedRequestId: sr.id,
    });
    pushToast({ title: "Request sent to Ticket Ops" });
    salesSendRequest({ appendMessage, setFlow });
  };

  return (
    <div className="ml-8 border border-[color:var(--color-border)] rounded-md p-3 bg-white text-[12.5px]">
      <div className="grid grid-cols-[110px_1fr] gap-y-1.5">
        <Label>Requested by</Label>
        <Value>{USERS.sales.name} (Sales)</Value>
        <Label>Fan</Label>
        <Value>{fan.name}</Value>
        <Label>From</Label>
        <Value>
          {sourceEvent?.title} ({sourceEvent ? formatEventDateTime(sourceEvent.dateTime) : ""}) — Section{" "}
          {seats[0]?.section} · Row {seats[0]?.row} · Seats {seats.map((s) => s.seat).join(", ")}
        </Value>
        <Label>Into</Label>
        <Value>
          {targetEvent
            ? `${targetEvent.title} (${formatEventDateTime(targetEvent.dateTime)})`
            : "—"}
        </Value>
        <Label>New seats</Label>
        <Value>
          {block
            ? `Section ${block.section} · Row ${block.row} · Seats ${block.seats} — ${formatCurrency(blockTotal)}`
            : "—"}
        </Value>
        <Label>Reconciliation</Label>
        <Value>{reconLabel}</Value>
        <Label>Preferences</Label>
        <Value>{flow.preferences || "—"}</Value>
        <Label>Note</Label>
        <Value>{flow.note || "—"}</Value>
      </div>

      {!disabled && (
        <div className="flex items-center mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onSend}
              className="bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[color:var(--color-primary-dark)]"
            >
              Send to Ticket Ops
            </button>
            <button
              onClick={() => openSalesEditMenu({ appendMessage, setFlow })}
              className="border border-[color:var(--color-border)] px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[#f4f6f9]"
            >
              Edit
            </button>
          </div>
          <button
            onClick={() => setConfirmCancel(true)}
            className="ml-auto bg-[#dc2626] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[#b91c1c]"
          >
            Cancel
          </button>
        </div>
      )}

      {confirmCancel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[color:var(--color-border)] w-full max-w-[340px] p-4">
            <div className="text-[13px] font-medium">
              Are you sure you want to cancel this request?
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmCancel(false)}
                className="border border-[color:var(--color-border)] px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[#f4f6f9]"
              >
                No, keep editing
              </button>
              <button
                onClick={() => {
                  setConfirmCancel(false);
                  clearConversation();
                }}
                className="bg-[#dc2626] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[#b91c1c]"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[color:var(--color-base-shade-300)]">{children}</div>;
}
function Value({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
