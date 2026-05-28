"use client";

import { getBlockOptions, ORDERS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import { pickBlock } from "@/lib/flows";

export function SeatBlockOptionsCards({ data }: { data: { targetEventId: string } }) {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const disabled = flow.step !== "choose-block";

  const fanId = flow.fanId;
  const order = fanId ? ORDERS.find((o) => o.fanId === fanId) : undefined;
  const sourceSeats =
    order?.lineItems.filter((li) => flow.sourceSeatIds?.includes(li.id)) ?? [];
  const refPricePerSeat = sourceSeats[0]?.price ?? 10;
  const blocks = getBlockOptions(data.targetEventId, refPricePerSeat, Math.max(1, sourceSeats.length));
  const seatCount = sourceSeats.length;
  const sourceTotal = sourceSeats.reduce((s, li) => s + li.price, 0);

  return (
    <div className="ml-8 grid grid-cols-1 gap-2">
      {blocks.map((b) => {
        const blockTotal = b.pricePerSeat * seatCount;
        const delta = blockTotal - sourceTotal;
        const deltaLabel =
          delta === 0
            ? "Same price"
            : delta > 0
              ? `+${formatCurrency(delta)} total`
              : `−${formatCurrency(Math.abs(delta))} total`;
        return (
          <button
            key={b.id}
            disabled={disabled}
            onClick={() =>
              pickBlock({
                blockId: b.id,
                priceDelta: delta,
                appendMessage,
                setFlow,
              })
            }
            className="text-left border border-[color:var(--color-border)] rounded-md p-3 hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 disabled:opacity-60 disabled:cursor-not-allowed flex gap-3 items-center"
          >
            <SectionMapSVG highlight={b.sectionMapHighlight} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold">
                Section {b.section} · Row {b.row} · Seats {b.seats}
              </div>
              <div className="text-[11.5px] text-[color:var(--color-base-shade-300)]">{b.note}</div>
              <div className="flex items-center gap-2 mt-1 text-[11.5px]">
                <span>{formatCurrency(b.pricePerSeat)}/seat</span>
                <span className="text-[color:var(--color-base-shade-300)]">·</span>
                <span
                  className={cn(
                    "font-semibold",
                    delta === 0
                      ? "text-[color:var(--color-base-shade-300)]"
                      : delta > 0
                        ? "text-[#d97706]"
                        : "text-[#16a34a]",
                  )}
                >
                  {deltaLabel}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SectionMapSVG({
  highlight,
}: {
  highlight: { x: number; y: number; w: number; h: number; color: string };
}) {
  return (
    <svg width="64" height="64" viewBox="0 0 200 200" className="shrink-0">
      {/* outer arena */}
      <rect x="10" y="10" width="180" height="180" rx="20" fill="#f7f9fb" stroke="#dee4eb" />
      {/* court */}
      <rect x="60" y="80" width="80" height="40" rx="4" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
      <line x1="100" y1="80" x2="100" y2="120" stroke="#d97706" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="6" fill="none" stroke="#d97706" strokeWidth="0.5" />
      {/* highlight */}
      <rect
        x={highlight.x}
        y={highlight.y}
        width={highlight.w}
        height={highlight.h}
        rx="2"
        fill={highlight.color}
        opacity="0.85"
      />
    </svg>
  );
}
