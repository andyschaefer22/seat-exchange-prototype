"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { salesAfterPreferences } from "@/lib/flows";

const CHIPS = ["Same price", "Closer to court", "Cheaper", "No preference"];

export function PreferenceChips() {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const [custom, setCustom] = useState("");
  const disabled = flow.step !== "sales-preferences";

  return (
    <div className="ml-8 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            disabled={disabled}
            onClick={() => salesAfterPreferences({ preferences: c, appendMessage, setFlow })}
            className="text-[12px] px-2.5 py-1 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] disabled:opacity-60"
          >
            {c}
          </button>
        ))}
      </div>
      {!disabled && (
        <div className="flex items-center gap-1.5">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type your own..."
            className="flex-1 border border-[color:var(--color-border)] rounded-md px-2 py-1 text-[12.5px] focus:outline-none focus:border-[color:var(--color-primary)]"
          />
          <button
            disabled={!custom.trim()}
            onClick={() =>
              salesAfterPreferences({
                preferences: custom.trim(),
                appendMessage,
                setFlow,
              })
            }
            className="bg-[color:var(--color-primary)] text-white px-3 py-1 rounded-md text-[12px] font-semibold disabled:opacity-40"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
