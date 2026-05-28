"use client";

import { useStore } from "@/lib/store";
import {
  salesEditField,
  salesEditableFields,
  SALES_EDIT_LABELS,
} from "@/lib/flows";
import { ChevronRight } from "lucide-react";

export function EditMenuCard() {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const setDraftInput = useStore((s) => s.setDraftInput);
  const disabled = flow.step !== "sales-edit-menu";

  const fields = salesEditableFields(flow);

  return (
    <div className="ml-8 border border-[color:var(--color-border)] rounded-md bg-white overflow-hidden">
      {fields.map((field, i) => (
        <button
          key={field}
          disabled={disabled}
          onClick={() =>
            salesEditField({ field, flow, appendMessage, setFlow, setDraftInput })
          }
          className={[
            "w-full flex items-center justify-between px-3 py-2.5 text-left text-[12.5px] disabled:opacity-60",
            i > 0 ? "border-t border-[color:var(--color-border)]" : "",
            "hover:bg-[#f4f6f9] disabled:hover:bg-transparent",
          ].join(" ")}
        >
          <span className="font-medium">{SALES_EDIT_LABELS[field]}</span>
          <ChevronRight size={14} className="text-[color:var(--color-base-shade-300)]" />
        </button>
      ))}
    </div>
  );
}
