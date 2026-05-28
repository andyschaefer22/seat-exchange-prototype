"use client";

import { useStore } from "@/lib/store";
import { salesSubmitNote, salesStartComment } from "@/lib/flows";

export function NoteActionsCard() {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const disabled = flow.step !== "sales-note";

  return (
    <div className="ml-8 flex flex-wrap gap-2">
      <button
        disabled={disabled}
        onClick={() => salesSubmitNote({ flow, appendMessage, setFlow })}
        className="bg-[color:var(--color-primary)] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60"
      >
        Submit
      </button>
      <button
        disabled={disabled}
        onClick={() => salesStartComment({ appendMessage, setFlow })}
        className="border border-[color:var(--color-border)] px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[#f4f6f9] disabled:opacity-60"
      >
        Add Comments
      </button>
    </div>
  );
}
