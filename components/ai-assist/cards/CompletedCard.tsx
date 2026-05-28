"use client";

import { CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";

export function CompletedCard() {
  const setFlow = useStore((s) => s.setFlow);
  const clearConversation = useStore((s) => s.clearConversation);
  return (
    <div className="ml-8 border border-[#dcfce7] bg-[#f0fdf4] rounded-md p-3 flex items-start gap-2">
      <CheckCircle2 size={16} className="text-[#16a34a] mt-0.5" />
      <div className="flex-1">
        <div className="text-[12.5px] font-medium">Exchange recorded</div>
        <div className="text-[11.5px] text-[color:var(--color-base-shade-300)]">
          The order page reflects the updated inventory.
        </div>
        <button
          onClick={() => {
            clearConversation();
            setFlow({ step: "idle" });
          }}
          className="text-[12px] text-[color:var(--color-primary)] font-semibold mt-2 hover:underline"
        >
          Start new conversation
        </button>
      </div>
    </div>
  );
}
