"use client";

import { useStore } from "@/lib/store";
import { ORDERS } from "@/lib/data";
import { pickReconciliation } from "@/lib/flows";
import { formatCurrency } from "@/lib/utils";

export function ReconciliationOptions({ data }: { data: { priceDelta: number } }) {
  const flow = useStore((s) => s.flow);
  const appendMessage = useStore((s) => s.appendMessage);
  const setFlow = useStore((s) => s.setFlow);
  const disabled = flow.step !== "reconciliation";
  const order = flow.fanId ? ORDERS.find((o) => o.fanId === flow.fanId) : undefined;

  const isUpcharge = data.priceDelta > 0;

  return (
    <div className="ml-8 flex flex-col gap-1.5">
      {isUpcharge && (
        <>
          <Option
            disabled={disabled}
            title="Charge the fan"
            subtitle={`+${formatCurrency(data.priceDelta)} to ${order?.paymentMethods[0]?.label ?? "default card"}`}
            onClick={() => pickReconciliation({ option: "charge", appendMessage, setFlow })}
          />
          <Option
            disabled={disabled}
            title="Reprice to match"
            subtitle="Lower new seat prices to the returned seat value"
            onClick={() => pickReconciliation({ option: "reprice", appendMessage, setFlow })}
          />
        </>
      )}
      {!isUpcharge && (
        <>
          <Option
            disabled={disabled}
            title="Leave overpaid"
            subtitle={`Order ends with positive customer balance (+${formatCurrency(Math.abs(data.priceDelta))})`}
            onClick={() => pickReconciliation({ option: "leave-overpaid", appendMessage, setFlow })}
          />
          <Option
            disabled={disabled}
            title="Reprice to match"
            subtitle="Adjust new seat prices to match returned seat value"
            onClick={() => pickReconciliation({ option: "reprice", appendMessage, setFlow })}
          />
        </>
      )}
      <div className="text-[11px] text-[color:var(--color-base-shade-300)] italic mt-1">
        Ticket credit is not enabled for the Timberwolves.
      </div>
    </div>
  );
}

function Option({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="text-left border border-[color:var(--color-border)] rounded-md px-3 py-2 hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="text-[12.5px] font-medium">{title}</div>
      <div className="text-[11px] text-[color:var(--color-base-shade-300)]">{subtitle}</div>
    </button>
  );
}
