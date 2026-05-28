"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { GameSelectionCards } from "./cards/GameSelectionCards";
import { SeatSelectionGrid } from "./cards/SeatSelectionGrid";
import { TargetGamePicker } from "./cards/TargetGamePicker";
import { SeatBlockOptionsCards } from "./cards/SeatBlockOptionsCards";
import { ReconciliationOptions } from "./cards/ReconciliationOptions";
import { ApprovalCard } from "./cards/ApprovalCard";
import { PreferenceChips } from "./cards/PreferenceChips";
import { RequestSummaryCard } from "./cards/RequestSummaryCard";
import { EditMenuCard } from "./cards/EditMenuCard";
import { NoteActionsCard } from "./cards/NoteActionsCard";
import { ExecutingCard } from "./cards/ExecutingCard";
import { CompletedCard } from "./cards/CompletedCard";

export function MessageList() {
  const conversation = useStore((s) => s.conversation);
  return (
    <div className="flex flex-col gap-3">
      {conversation.map((m) => (
        <div key={m.id} className="flex flex-col gap-2">
          <div
            className={cn(
              "flex gap-2",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "assistant" && (
              <div
                className="w-6 h-6 rounded-full grid place-items-center text-white shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg, #4c2ffe 0%, #6f4dff 100%)" }}
              >
                <Sparkles size={11} />
              </div>
            )}
            {m.text && (
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-snug",
                  m.role === "user"
                    ? "bg-[color:var(--color-primary)] text-white"
                    : "bg-[color:var(--color-base-shade-100)] text-[color:var(--color-base-text)]",
                )}
              >
                {m.text}
              </div>
            )}
          </div>
          {m.ui && <UIBlock kind={m.ui.kind} data={m.ui.data} />}
        </div>
      ))}
    </div>
  );
}

function UIBlock({ kind, data }: { kind: string; data?: unknown }) {
  switch (kind) {
    case "game-cards":
      return <GameSelectionCards data={data as { eventIds: string[]; fanId: string; salesMode?: boolean }} />;
    case "seat-grid":
      return <SeatSelectionGrid data={data as { eventId: string; fanId: string; salesMode?: boolean }} />;
    case "target-game-picker":
      return <TargetGamePicker data={data as { salesMode?: boolean } | undefined} />;
    case "block-options":
      return <SeatBlockOptionsCards data={data as { targetEventId: string; salesMode?: boolean }} />;
    case "reconciliation":
      return <ReconciliationOptions data={data as { priceDelta: number; salesMode?: boolean }} />;
    case "approval-card":
      return <ApprovalCard />;
    case "preference-chips":
      return <PreferenceChips />;
    case "request-summary":
      return <RequestSummaryCard />;
    case "edit-menu":
      return <EditMenuCard />;
    case "note-actions":
      return <NoteActionsCard />;
    case "executing":
      return <ExecutingCard />;
    case "completed":
      return <CompletedCard />;
    default:
      return null;
  }
}
