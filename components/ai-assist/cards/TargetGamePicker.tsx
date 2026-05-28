"use client";

import { useState } from "react";
import { UPCOMING_EVENTS, formatEventDateTime } from "@/lib/data";
import { useStore } from "@/lib/store";
import { pickTargetGame, salesPickTargetGame } from "@/lib/flows";
import { ChevronDown } from "lucide-react";

export function TargetGamePicker({ data }: { data?: { salesMode?: boolean } }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const salesMode = data?.salesMode ?? false;
  const disabled = salesMode
    ? flow.step !== "sales-target-game"
    : flow.step !== "choose-target-game";

  const filtered = UPCOMING_EVENTS.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.shortTitle?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="ml-8 relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border border-[color:var(--color-border)] rounded-md px-3 py-2 text-[12.5px] hover:border-[color:var(--color-primary)] disabled:opacity-60"
      >
        <span className="text-[color:var(--color-base-shade-300)]">
          {flow.targetEventId
            ? UPCOMING_EVENTS.find((e) => e.id === flow.targetEventId)?.title
            : "Select a target game..."}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && !disabled && (
        <div className="absolute z-10 mt-1 left-0 right-0 bg-white border border-[color:var(--color-border)] rounded-md shadow-md max-h-72 overflow-y-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 text-[12.5px] border-b border-[color:var(--color-border)] focus:outline-none"
            autoFocus
          />
          {filtered.map((ev) => (
            <button
              key={ev.id}
              onClick={() => {
                setOpen(false);
                if (salesMode) {
                  salesPickTargetGame({ targetEventId: ev.id, flow, appendMessage, setFlow });
                } else {
                  pickTargetGame({ targetEventId: ev.id, appendMessage, setFlow });
                }
              }}
              className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-[#f4f6f9]"
            >
              <div className="font-medium">{ev.title}</div>
              <div className="text-[11px] text-[color:var(--color-base-shade-300)]">
                {formatEventDateTime(ev.dateTime)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
