"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Filter,
  MoreHorizontal,
  Maximize2,
  Rows3,
  X,
  Plus,
  Calendar,
  User as UserIcon,
  Mail,
  Tag,
} from "lucide-react";
import {
  ALL_EVENTS,
  FANS_BY_ID,
  type LineItem,
  type Order,
  formatEventDateTime,
  formatShortDate,
} from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";

export function OrderPage({ order }: { order: Order }) {
  const fan = FANS_BY_ID[order.fanId];
  const overrides = useStore((s) => s.lineItemStatusOverrides);
  const added = useStore((s) => s.addedLineItems);
  const setContextPage = useStore((s) => s.setContextPage);

  useEffect(() => {
    setContextPage({ kind: "order", orderId: order.id, fanId: order.fanId });
  }, [order.id, order.fanId, setContextPage]);

  const lineItems = useMemo(() => {
    const withOverrides = order.lineItems.map((li) => ({
      ...li,
      status: overrides[li.id] ?? li.status,
    }));
    const orderAddedIds = new Set(order.lineItems.map((li) => li.id));
    const newOnes = added.filter(
      (a) => a.id.startsWith(`added_${order.id}_`) || (a as { __orderId?: string }).__orderId === order.id,
    );
    return [...withOverrides, ...newOnes].filter((li) => filterApply(li));
  }, [order, overrides, added]);

  const grouped = useMemo(() => groupByEvent(lineItems), [lineItems]);

  return (
    <div className="px-6 py-5 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[12px] text-[color:var(--color-base-shade-300)] mb-2">
        <Link href="/orders" className="hover:text-[color:var(--color-base-text)]">
          Search
        </Link>
        <ChevronRight size={12} />
        <span className="text-[color:var(--color-base-text)]">{order.id}</span>
      </div>

      {/* Order ID + status pills */}
      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-[color:var(--color-base-text)]">
          {order.id}
        </h1>
        <StatusPill label={order.status} tone="success" />
        <StatusPill label={order.payment} tone="success-soft" />
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[color:var(--color-base-shade-300)] mb-5">
        <span className="inline-flex items-center gap-1.5">
          <UserIcon size={13} />
          <Link
            href={`/fans/${fan.id}`}
            className="text-[color:var(--color-primary)] font-medium hover:underline"
          >
            {fan.name}
          </Link>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mail size={13} />
          {fan.email}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={13} />
          {order.date}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Tag size={13} />
          {order.planName}
        </span>
        <span className="inline-flex items-center gap-1.5">{order.assignment}</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-[color:var(--color-border)] flex items-center gap-6 mb-4">
        <Tab label="Line Items" active />
        <Tab label="Payments" />
        <Tab label="Activity" />
      </div>

      {/* Filter chips + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#f1f3f6] rounded-md pl-2 pr-1 py-1 text-[12px]">
            <input type="checkbox" defaultChecked className="accent-[color:var(--color-primary)]" />
            <span>Status is not Cancelled</span>
            <button className="text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)] ml-1">
              <X size={12} />
            </button>
          </div>
          <button className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-primary)] font-medium hover:underline px-2 py-1">
            <Plus size={12} /> Add Filter
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-[12px] text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)] px-2">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Inventory Items header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-semibold">Inventory Items</h2>
        <div className="flex items-center gap-1">
          <IconBtn>
            <Filter size={14} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 grid place-items-center bg-[color:var(--color-primary)] text-white text-[9px] rounded-full">
              1
            </span>
          </IconBtn>
          <IconBtn>
            <Maximize2 size={14} />
          </IconBtn>
          <IconBtn>
            <MoreHorizontal size={14} />
          </IconBtn>
          <IconBtn>
            <Rows3 size={14} />
          </IconBtn>
          <button className="ml-2 inline-flex items-center gap-1 bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold tracking-wide uppercase hover:bg-[color:var(--color-primary-dark)]">
            <Plus size={12} /> Add to Order
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-[#f7f9fb] text-[11.5px] uppercase text-[color:var(--color-base-shade-300)] tracking-wide">
            <tr>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" className="accent-[color:var(--color-primary)]" />
              </th>
              <th className="px-2 py-2 text-left font-medium">Event</th>
              <th className="px-2 py-2 text-left font-medium">Product</th>
              <th className="px-2 py-2 text-left font-medium">Item</th>
              <th className="px-2 py-2 text-left font-medium">Status</th>
              <th className="px-2 py-2 text-right font-medium">Price</th>
              <th className="px-2 py-2 text-right font-medium">Fees</th>
              <th className="px-2 py-2 text-right font-medium">Taxes</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-right font-medium">Paid</th>
              <th className="px-2 py-2 text-left font-medium">Price Level</th>
              <th className="px-2 py-2 text-left font-medium">Price Type</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <EventGroupRows key={g.eventId} group={g} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function filterApply(_li: LineItem): boolean {
  return true; // "Status is not Cancelled" — we don't render Cancelled anyway in this dataset
}

function groupByEvent(items: LineItem[]) {
  const map = new Map<string, LineItem[]>();
  for (const it of items) {
    const a = map.get(it.eventId) ?? [];
    a.push(it);
    map.set(it.eventId, a);
  }
  return [...map.entries()].map(([eventId, items]) => ({ eventId, items }));
}

function EventGroupRows({ group }: { group: { eventId: string; items: LineItem[] } }) {
  const ev = ALL_EVENTS[group.eventId];
  const [open, setOpen] = useState(true);
  return (
    <>
      <tr className="bg-[#fafbfc] border-t border-[color:var(--color-border)]">
        <td className="px-3 py-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)]"
            aria-label="Toggle"
          >
            <ChevronRight size={14} className={cn("transition-transform", open && "rotate-90")} />
          </button>
        </td>
        <td colSpan={11} className="px-2 py-2 font-medium text-[color:var(--color-base-text)]">
          {ev?.title ?? group.eventId}{" "}
          <span className="text-[11.5px] text-[color:var(--color-base-shade-300)] font-normal">
            · {ev ? formatEventDateTime(ev.dateTime) : ""}
          </span>
        </td>
      </tr>
      {open &&
        group.items.map((li) => (
          <tr key={li.id} className="border-t border-[color:var(--color-border)] hover:bg-[#fafbfc]">
            <td className="px-3 py-2">
              <input type="checkbox" className="accent-[color:var(--color-primary)]" />
            </td>
            <td className="px-2 py-2 text-[color:var(--color-base-shade-300)]">{ev?.shortTitle ?? "—"}</td>
            <td className="px-2 py-2">{li.product}</td>
            <td className="px-2 py-2">
              Sec {li.section} · Row {li.row} · Seat {li.seat}
            </td>
            <td className="px-2 py-2">
              <StatusPill
                label={li.status}
                tone={li.status === "Confirmed" ? "success" : li.status === "Exchanged" ? "warning" : "neutral"}
                small
              />
            </td>
            <td className="px-2 py-2 text-right">{formatCurrency(li.price)}</td>
            <td className="px-2 py-2 text-right text-[color:var(--color-base-shade-300)]">{formatCurrency(li.fees)}</td>
            <td className="px-2 py-2 text-right text-[color:var(--color-base-shade-300)]">{formatCurrency(li.taxes)}</td>
            <td className="px-2 py-2 text-right font-medium">{formatCurrency(li.price + li.fees + li.taxes)}</td>
            <td className="px-2 py-2 text-right">{formatCurrency(li.paid)}</td>
            <td className="px-2 py-2">
              <Chip>{li.priceLevel}</Chip>
            </td>
            <td className="px-2 py-2 text-[color:var(--color-base-shade-300)]">{li.priceType}</td>
          </tr>
        ))}
    </>
  );
}

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "py-2.5 text-[13px] -mb-px border-b-2",
        active
          ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)] font-semibold"
          : "border-transparent text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)]",
      )}
    >
      {label}
    </button>
  );
}

function StatusPill({
  label,
  tone,
  small,
}: {
  label: string;
  tone: "success" | "success-soft" | "warning" | "neutral" | "danger";
  small?: boolean;
}) {
  const tones: Record<string, string> = {
    success: "bg-[#dcfce7] text-[#166534]",
    "success-soft": "bg-[#e0f2fe] text-[#075985]",
    warning: "bg-[#fef3c7] text-[#92400e]",
    neutral: "bg-[#f1f3f6] text-[color:var(--color-base-shade-300)]",
    danger: "bg-[#fee2e2] text-[#991b1b]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[11.5px]",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center bg-[#f1f3f6] text-[color:var(--color-base-text)] rounded-md px-2 py-0.5 text-[11.5px]">
      {children}
    </span>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="relative w-8 h-8 grid place-items-center rounded-md text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)] hover:bg-[#f4f6f9]">
      {children}
    </button>
  );
}

// helper export so we don't have a dead import
export { formatShortDate };
