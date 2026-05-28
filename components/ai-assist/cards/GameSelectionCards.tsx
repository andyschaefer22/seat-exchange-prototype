"use client";

import { ALL_EVENTS, ORDERS, formatEventDateTime } from "@/lib/data";
import { useStore } from "@/lib/store";
import { pickSourceGame } from "@/lib/flows";

export function GameSelectionCards({ data }: { data: { eventIds: string[]; fanId: string } }) {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const order = ORDERS.find((o) => o.fanId === data.fanId);
  const disabled = flow.step !== "choose-source-game";

  return (
    <div className="flex flex-col gap-2 ml-8">
      {data.eventIds.map((eid) => {
        const ev = ALL_EVENTS[eid];
        const count = order?.lineItems.filter((li) => li.eventId === eid).length ?? 0;
        return (
          <button
            key={eid}
            disabled={disabled}
            onClick={() => pickSourceGame({ eventId: eid, fanId: data.fanId, appendMessage, setFlow })}
            className="text-left border border-[color:var(--color-border)] rounded-md px-3 py-2.5 hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-[13px] font-medium">{ev?.title}</div>
            <div className="text-[11.5px] text-[color:var(--color-base-shade-300)]">
              {ev ? formatEventDateTime(ev.dateTime) : ""} · {count} seats
            </div>
          </button>
        );
      })}
    </div>
  );
}
