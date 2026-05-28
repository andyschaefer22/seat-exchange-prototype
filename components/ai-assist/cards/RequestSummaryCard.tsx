"use client";

import { useStore } from "@/lib/store";
import {
  ALL_EVENTS,
  FANS_BY_ID,
  ORDERS,
  USERS,
  formatEventDateTime,
} from "@/lib/data";
import { salesSendRequest } from "@/lib/flows";
import { useToasts } from "@/components/ToastHost";

export function RequestSummaryCard() {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const createStagedRequest = useStore((s) => s.createStagedRequest);
  const addNotification = useStore((s) => s.addNotification);
  const pushToast = useToasts((s) => s.push);

  if (!flow.fanId || !flow.sourceEventId) return null;
  const fan = FANS_BY_ID[flow.fanId];
  const order = ORDERS.find((o) => o.fanId === fan.id);
  const seats = order?.lineItems.filter((li) => flow.sourceSeatIds?.includes(li.id)) ?? [];
  const sourceEvent = ALL_EVENTS[flow.sourceEventId];
  const disabled = flow.step !== "sales-summary";

  const onSend = () => {
    if (!flow.fanId || !flow.sourceEventId || !flow.sourceSeatIds) return;
    const sr = createStagedRequest({
      fanId: flow.fanId,
      requestedBy: `${USERS.sales.name} (Sales)`,
      sourceEventId: flow.sourceEventId,
      sourceSeatIds: flow.sourceSeatIds,
      preferences: flow.preferences ?? "",
      note: flow.note ?? "",
    });
    addNotification({
      forRole: "admin",
      kind: "request-pending",
      title: `New exchange request from ${USERS.sales.name} for ${fan.name}`,
      body: `${seats.length} seats from ${sourceEvent?.title}. Preferences: ${flow.preferences || "none"}`,
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
        <Label>Preferences</Label>
        <Value>{flow.preferences || "—"}</Value>
        <Label>Note</Label>
        <Value>{flow.note || "—"}</Value>
      </div>

      {!disabled && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onSend}
            className="bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[color:var(--color-primary-dark)]"
          >
            Send to Ticket Ops
          </button>
          <button
            onClick={() => setFlow({ step: "sales-note" })}
            className="border border-[color:var(--color-border)] px-3 py-1.5 rounded-md text-[12px] font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => setFlow({ step: "idle" })}
            className="text-[12px] text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)] px-2"
          >
            Cancel
          </button>
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
