"use client";

import { useStore, useRoleStore } from "@/lib/store";
import {
  ALL_EVENTS,
  FANS_BY_ID,
  ORG,
  ORDERS,
  formatEventDateTime,
  getBlockOptions,
  type LineItem,
} from "@/lib/data";
import { exchangeCompleted, executeExchange } from "@/lib/flows";
import { formatCurrency, uid } from "@/lib/utils";
import { useToasts } from "@/components/ToastHost";

export function ApprovalCard() {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const applyExchange = useStore((s) => s.applyExchange);
  const updateStagedRequest = useStore((s) => s.updateStagedRequest);
  const addNotification = useStore((s) => s.addNotification);
  const pushToast = useToasts((s) => s.push);
  const role = useRoleStore((s) => s.currentRole);

  const disabled = flow.step !== "approval";

  if (!flow.fanId || !flow.sourceEventId || !flow.targetEventId || !flow.chosenBlockId) {
    return null;
  }

  const fan = FANS_BY_ID[flow.fanId];
  const order = ORDERS.find((o) => o.fanId === flow.fanId);
  const sourceSeats = order?.lineItems.filter((li) => flow.sourceSeatIds?.includes(li.id)) ?? [];
  const sourceTotal = sourceSeats.reduce((s, li) => s + li.price, 0);
  const sourceEvent = ALL_EVENTS[flow.sourceEventId];
  const targetEvent = ALL_EVENTS[flow.targetEventId];

  const refPrice = sourceSeats[0]?.price ?? 10;
  const blocks = getBlockOptions(flow.targetEventId, refPrice, sourceSeats.length || 1);
  const block = blocks.find((b) => b.id === flow.chosenBlockId);
  if (!block) return null;
  const blockTotal = block.pricePerSeat * (sourceSeats.length || 1);
  const delta = blockTotal - sourceTotal;

  const isAtLimit = fan.exchangesUsedThisSeason >= ORG.exchangeLimit;

  const onConfirm = () => {
    if (isAtLimit) return; // limit-override path is shown separately
    executeExchange({ appendMessage, setFlow });
    // simulate execution
    setTimeout(() => {
      const orderForFan = ORDERS.find((o) => o.fanId === flow.fanId);
      if (!orderForFan) return;
      // Build new line items for added seats
      const seatsArray = expandSeatRange(block.seats);
      const added: LineItem[] = seatsArray.map((seatNum) => ({
        id: `added_${orderForFan.id}_${uid("li")}`,
        eventId: block.eventId,
        product: "Single Game Adult",
        section: block.section,
        row: block.row,
        seat: String(seatNum),
        status: "Confirmed",
        price: block.pricePerSeat,
        fees: 0,
        taxes: 0,
        paid: block.pricePerSeat,
        priceLevel: block.priceLevel,
        priceType: "Single Game Adult",
      }));
      applyExchange(flow.sourceSeatIds ?? [], added);
      exchangeCompleted({ fanName: fan.name, appendMessage, setFlow });

      // If admin is executing a Sales-routed request, notify Sales
      if (flow.reviewingNotificationId) {
        updateStagedRequest(flow.reviewingNotificationId, { status: "executed" });
        addNotification({
          forRole: "sales",
          kind: "request-executed",
          title: `Your exchange request for ${fan.name} has been completed`,
          body: `Section ${block.section} Row ${block.row} Seats ${block.seats} · ${targetEvent?.title}`,
          stagedRequestId: flow.reviewingNotificationId,
        });
        pushToast({ title: "Exchange executed", body: `Marcus has been notified.` });
      }
    }, 1500);
  };

  return (
    <div className="ml-8 border border-[color:var(--color-border)] rounded-md p-3 bg-white">
      <div className="text-[12.5px] grid grid-cols-[110px_1fr] gap-y-1.5">
        <Label>Removing</Label>
        <Value>
          Section {sourceSeats[0]?.section} · Row {sourceSeats[0]?.row} · Seats{" "}
          {sourceSeats.map((s) => s.seat).join(", ")} ({sourceEvent?.title}{" "}
          {sourceEvent ? formatEventDateTime(sourceEvent.dateTime) : ""}) — {formatCurrency(sourceTotal)}
        </Value>
        <Label>Adding</Label>
        <Value>
          Section {block.section} · Row {block.row} · Seats {block.seats} ({targetEvent?.title}{" "}
          {targetEvent ? formatEventDateTime(targetEvent.dateTime) : ""}) — {formatCurrency(blockTotal)}
        </Value>
        <Label>Reconciliation</Label>
        <Value>
          {flow.reconciliation === "charge" && `Charge the fan (+${formatCurrency(Math.abs(delta))})`}
          {flow.reconciliation === "reprice" && "Reprice to match"}
          {flow.reconciliation === "leave-overpaid" &&
            `Leave overpaid (+${formatCurrency(Math.abs(delta))} customer balance)`}
          {!flow.reconciliation && `None (${formatCurrency(delta)} delta)`}
        </Value>
        <Label>Org policy check</Label>
        <Value>
          {isAtLimit ? (
            <span className="text-[#dc2626]">
              {fan.name.split(" ")[0]} has used {fan.exchangesUsedThisSeason} of {ORG.exchangeLimit} exchanges this
              season ⚠
            </span>
          ) : (
            <span className="text-[#16a34a]">
              {fan.name.split(" ")[0]} has used {fan.exchangesUsedThisSeason} of {ORG.exchangeLimit} exchanges this
              season ✓
            </span>
          )}
        </Value>
      </div>

      {!disabled && !isAtLimit && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onConfirm}
            className="bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[color:var(--color-primary-dark)]"
          >
            Confirm & Execute
          </button>
          <button
            onClick={() => setFlow({ step: "idle" })}
            className="text-[12px] text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)] px-2"
          >
            Cancel
          </button>
        </div>
      )}

      {!disabled && isAtLimit && (
        <div className="mt-3 border-t border-[color:var(--color-border)] pt-3">
          <div className="text-[12.5px] mb-2">
            {fan.name.split(" ")[0]} has reached the org's seat exchange limit ({ORG.exchangeLimit} per season).
            Would you like to override and proceed anyway?
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Override: pretend limit doesn't apply
                fan.exchangesUsedThisSeason = ORG.exchangeLimit - 1; // hack so onConfirm passes
                onConfirm();
              }}
              className="bg-[#d97706] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold"
            >
              Yes, override
            </button>
            <button
              onClick={() => setFlow({ step: "idle" })}
              className="border border-[color:var(--color-border)] px-3 py-1.5 rounded-md text-[12px] font-medium"
            >
              No, cancel
            </button>
          </div>
        </div>
      )}

      {disabled && role === "admin" && flow.step === "done" && (
        <div className="mt-3 text-[12px] text-[color:var(--color-base-shade-300)] italic">Executed.</div>
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

function expandSeatRange(label: string): number[] {
  if (label.includes("-")) {
    const [a, b] = label.split("-").map((s) => parseInt(s.trim(), 10));
    const out: number[] = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }
  return [parseInt(label, 10)];
}
