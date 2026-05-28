"use client";

import { useState } from "react";
import {
  ALL_EVENTS,
  FANS_BY_ID,
  ORDERS,
  formatEventDateTime,
} from "@/lib/data";
import { useStore, type Notification } from "@/lib/store";
import { useToasts } from "./ToastHost";
import { startAdminReviewFlow } from "@/lib/flows";
import { cn, formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export function NotificationItem({ notification }: { notification: Notification }) {
  const [open, setOpen] = useState(false);
  const stagedRequests = useStore((s) => s.stagedRequests);
  const updateStagedRequest = useStore((s) => s.updateStagedRequest);
  const addNotification = useStore((s) => s.addNotification);
  const markRead = useStore((s) => s.markNotificationRead);
  const openChat = useStore((s) => s.openChat);
  const setFlow = useStore((s) => s.setFlow);
  const appendMessage = useStore((s) => s.appendMessage);
  const clearConversation = useStore((s) => s.clearConversation);
  const setContextPage = useStore((s) => s.setContextPage);
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
          onReview={() => {
            const fan = FANS_BY_ID[req.fanId];
            const order = ORDERS.find((o) => o.fanId === req.fanId);
            if (!order) return;
            clearConversation();
            setContextPage({ kind: "order", orderId: order.id, fanId: fan.id });
            startAdminReviewFlow({
              req,
              appendMessage,
              setFlow,
            });
            openChat();
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
  onReview,
  onReject,
}: {
  req: import("@/lib/store").StagedRequest;
  onReview: () => void;
  onReject: (reason: string) => void;
}) {
  const fan = FANS_BY_ID[req.fanId];
  const order = ORDERS.find((o) => o.fanId === req.fanId);
  const sourceEvent = ALL_EVENTS[req.sourceEventId];
  const seats = order?.lineItems.filter((li) => req.sourceSeatIds.includes(li.id)) ?? [];
  const removalTotal = seats.reduce((sum, s) => sum + s.price, 0);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");

  if (req.status !== "pending") {
    return (
      <div className="px-4 pb-4 text-[12.5px]">
        <div className="border-t border-[color:var(--color-border)] pt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f1f3f6] text-[color:var(--color-base-shade-300)] text-[11px] font-medium">
            {req.status === "executed" ? "Executed" : "Rejected"}
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
        <Field label="Agent" value="Seat Exchange Agent" />
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
        <Field label="Adding" value={<em className="text-[color:var(--color-base-shade-300)]">Populated during review</em>} />
        <Field label="Pre-existing balance" value="$0.00" />
        <Field label="Staged at" value={new Date(req.createdAt).toLocaleString()} />
        <Field label="Preferences" value={req.preferences || "—"} />
        <Field label="Note from Sales" value={req.note || "—"} />
      </div>

      {!rejectMode ? (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onReview}
            className="bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[color:var(--color-primary-dark)]"
          >
            Review & Execute
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
