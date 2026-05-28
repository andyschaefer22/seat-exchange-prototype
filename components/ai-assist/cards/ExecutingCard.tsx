"use client";

import { Loader2 } from "lucide-react";

export function ExecutingCard() {
  return (
    <div className="ml-8 flex items-center gap-2 text-[12.5px] text-[color:var(--color-base-shade-300)]">
      <Loader2 size={14} className="animate-spin" />
      Updating order and recording exchange...
    </div>
  );
}
