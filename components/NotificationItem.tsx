"use client";

import { useState } from "react";
import {
  ALL_EVENTS,
  FANS_BY_ID,
  ORDERS,
  formatEventDateTime,
  type LineItem,
} from "@/lib/data";
import { useStore, useRoleStore, type Notification } from "@/lib/store";
import { useToasts } from "./ToastHost";
import { cn, formatCurrency, uid, expandSeatRange } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export function NotificationItem({ notification }: { notification: Notification }) {
  const [open, setOpen] = useState(false);
  const role = useRoleStore((s) => s.currentRole);
  const stagedRequests = useStore((s) => s.stagedRequests);
  const notifications = useStore((s) => s.notifications);
  const updateStagedRequest = useStore((s) => s.updateStagedRequest);
  const addNotification = useStore((s) => s.addNotification);
  const removeNotification = useStore((s) => s.removeNotification);
  const markRead = useStore((s) => s.markNotificationRead);
  const applyExchange = useStore((s) => s.applyExchange);
  const pushToast = useToasts((s) => s.push);

  const req = notification.stagedRequestId
    ? stagedRequests.find((r) => r.id === notification.stagedRequestId)
    : undefined;

  const onOpen = () => {
    setOpen((v) => !v);
    if (!notification.read) markRead(notification.id);
  };

  return (
    <div className="border border-[color:var(--color-border)] rounded-md bg-white">
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            notification.read ? "bg-[color:var(--color-border)]" : "bg-[color:var(--color-primary)]",
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">{notification.title}</div>
          <div className="text-[12px] text-[color:var(--color-base-shade-300)] truncate">{notification.body}</div>
        </div>
        <div className="text-[11px] text-[color:var(--color-base-shade-300)]">
          {new Date(notification.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && req && (
        <ApprovalPreviewCard
          req={req}
          role={role}
          onCancel={() => {
            updateStagedRequest(req.id, { status: "cancelled" });
            // Remove the Admin's pending approval notification for this request.
            const adminPending = notifications.find(
              (n) =>
                n.forRole === "admin" &&
                n.kind === "request-pending" &&
                n.stagedRequestId === req.id,
            );
            if (adminPending) removeNotification(adminPending.id);
            pushToast({ title: "Request cancelled" });
          }}
          onExecute={() => {
            const fan = FANS_BY_ID[req.fanId];
            const order = ORDERS.find((o) => o.fanId === req.fanId);
            const block = req.targetBlock;
            if (!order || !block) return;
            // Apply the exchange directly — no AI Assist. The Sales rep already
            // chose the target block and reconciliation.
            const added: LineItem[] = expandSeatRange(block.seats).map((seatNum) => ({
              id: `added_${order.id}_${uid("li")}`,
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
            applyExchange(req.sourceSeatIds, added);
            updateStagedRequest(req.id, { status: "executed" });
            addNotification({
              forRole: "sales",
              kind: "request-executed",
              title: `Your exchange request for ${fan.name} has been completed.`,
              body: `Section ${block.section} Row ${block.row} Seats ${block.seats} · ${
                req.targetEventId ? ALL_EVENTS[req.targetEventId]?.title : ""
              }`,
              stagedRequestId: req.id,
            });
            pushToast({ title: `Exchange executed for ${fan.name}` });
          }}
          onReject={(reason) => {
            updateStagedRequest(req.id, { status: "rejected", rejectReason: reason });
            // notify sales
            addNotification({
              forRole: "sales",
              kind: "request-rejected",
              title: `Your exchange request for ${FANS_BY_ID[req.fanId].name} was rejected`,
              body: `Reason: ${reason}`,
              stagedRequestId: req.id,
            });
            pushToast({ title: "Request rejected", body: "Marcus has been notified." });
          }}
        />
      )}
    </div>
  );
}

function ApprovalPreviewCard({
  req,
  role,
  onExecute,
  onReject,
  onCancel,
}: {
  req: import("@/lib/store").StagedRequest;
  role: "admin" | "sales";
  onExecute: () => void;
  onReject: (reason: string) => void;
  onCancel: () => void;
}) {
  const fan = FANS_BY_ID[req.fanId];
  const order = ORDERS.find((o) => o.fanId === req.fanId);
  const sourceEvent = ALL_EVENTS[req.sourceEventId];
  const targetEvent = req.targetEventId ? ALL_EVENTS[req.targetEventId] : undefined;
  const seats = order?.lineItems.filter((li) => req.sourceSeatIds.includes(li.id)) ?? [];
  const removalTotal = seats.reduce((sum, s) => sum + s.price, 0);
  const block = req.targetBlock;
  const blockTotal = block ? block.pricePerSeat * (seats.length || 1) : 0;
  const delta = req.priceDelta ?? 0;
  const reconLabel =
    delta === 0
      ? "None — no price delta"
      : req.reconciliation === "charge"
        ? `Charge the fan (+${formatCurrency(Math.abs(delta))})`
        : req.reconciliation === "reprice"
          ? "Reprice to match"
          : req.reconciliation === "leave-overpaid"
            ? `Leave overpaid (+${formatCurrency(Math.abs(delta))} balance)`
            : "—";
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");

  if (req.status !== "pending") {
    const statusLabel =
      req.status === "executed"
        ? "Executed"
        : req.status === "rejected"
          ? "Rejected"
          : "Cancelled";
    return (
      <div className="px-4 pb-4 text-[12.5px]">
        <div className="border-t border-[color:var(--color-border)] pt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f1f3f6] text-[color:var(--color-base-shade-300)] text-[11px] font-medium">
            {statusLabel}
          </span>
          {req.rejectReason && (
            <div className="mt-2 text-[color:var(--color-base-shade-300)]">Reason: {req.rejectReason}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 text-[12.5px] border-t border-[color:var(--color-border)] pt-3">
      <div className="grid grid-cols-[120px_1fr] gap-y-1.5">
        <Field label="Requested by" value={req.requestedBy} />
        <Field label="Fan" value={`${fan.name} · ${fan.email}`} />
        <Field label="Order" value={order?.id ?? "—"} />
        <Field
          label="Removing"
          value={
            seats.length > 0 ? (
              <span>
                Section {seats[0].section} · Row {seats[0].row} · Seats {seats.map((s) => s.seat).join(", ")} (
                {sourceEvent?.title} {sourceEvent ? formatEventDateTime(sourceEvent.dateTime) : ""}) —{" "}
                {formatCurrency(removalTotal)}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field
          label="Adding"
          value={
            targetEvent && block ? (
              <span>
                Section {block.section} · Row {block.row} · Seats {block.seats} ({targetEvent.title}{" "}
                {formatEventDateTime(targetEvent.dateTime)}) — {formatCurrency(blockTotal)}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field label="Reconciliation" value={reconLabel} />
        <Field label="Preferences" value={req.preferences || "—"} />
        <Field label="Note from Sales" value={req.note || "—"} />
        <Field label="Staged at" value={new Date(req.createdAt).toLocaleString()} />
      </div>

      {role === "sales" ? (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onCancel}
            className="bg-[#dc2626] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[#b91c1c]"
          >
            Cancel Request
          </button>
        </div>
      ) : !rejectMode ? (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onExecute}
            className="bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[color:var(--color-primary-dark)]"
          >
            Execute
          </button>
          <button
            onClick={() => setRejectMode(true)}
            className="border border-[color:var(--color-border)] px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[#f4f6f9]"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <label className="block text-[11.5px] font-medium mb-1">Reason for rejection</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full border border-[color:var(--color-border)] rounded-md px-2 py-1 text-[12.5px]"
            placeholder="Let Marcus know why..."
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => {
                if (reason.trim()) onReject(reason.trim());
              }}
              className="bg-[#dc2626] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold disabled:opacity-50"
              disabled={!reason.trim()}
            >
              Submit Rejection
            </button>
            <button
              onClick={() => setRejectMode(false)}
              className="text-[12px] text-[color:var(--color-base-shade-300)] px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <div className="text-[color:var(--color-base-shade-300)]">{label}</div>
      <div>{value}</div>
    </>
  );
}
