"use client";

import { useState } from "react";
import { ORDERS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import { pickSourceSeats, salesAfterSeats } from "@/lib/flows";

export function SeatSelectionGrid({
  data,
}: {
  data: { eventId: string; fanId: string; salesMode?: boolean };
}) {
  const order = ORDERS.find((o) => o.fanId === data.fanId);
  const seats = order?.lineItems.filter((li) => li.eventId === data.eventId) ?? [];
  const flow = useStore((s) => s.flow);
  // In Sales mode, pre-select any seats already chosen (e.g. when re-editing the
  // selection from the summary). Empty on the first pass since none are chosen yet.
  const [selected, setSelected] = useState<string[]>(() =>
    data.salesMode
      ? (flow.sourceSeatIds ?? []).filter((id) => seats.some((s) => s.id === id))
      : [],
  );
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const submitted = flow.step !== "choose-seats";

  const total = selected.reduce((sum, id) => sum + (seats.find((s) => s.id === id)?.price ?? 0), 0);

  const toggle = (id: string) => {
    if (submitted) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const onContinue = () => {
    if (selected.length === 0) return;
    if (data.salesMode) {
      salesAfterSeats({ seatIds: selected, flow, appendMessage, setFlow });
    } else {
      pickSourceSeats({ seatIds: selected, appendMessage, setFlow });
    }
  };

  return (
    <div className="ml-8 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        {seats.map((s) => {
          const sel = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              disabled={submitted}
              className={cn(
                "text-left border rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2 disabled:opacity-60",
                sel
                  ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/8"
                  : "border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]",
              )}
            >
              <input
                type="checkbox"
                checked={sel}
                readOnly
                className="accent-[color:var(--color-primary)]"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  Sec {s.section} · Row {s.row} · Seat {s.seat}
                </div>
                <div className="text-[10.5px] text-[color:var(--color-base-shade-300)]">
                  {formatCurrency(s.price)} · {s.priceLevel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-[12px] text-[color:var(--color-base-shade-300)]">
          Selected: {selected.length} seat{selected.length === 1 ? "" : "s"} · {formatCurrency(total)}
        </div>
        {!submitted && (
          <button
            onClick={onContinue}
            disabled={selected.length === 0}
            className="bg-[color:var(--color-primary)] text-white px-3 py-1 rounded-md text-[12px] font-semibold disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)]"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
