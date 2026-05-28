import { notFound } from "next/navigation";
import { FANS_BY_ID, findOrderByFanId, ALL_EVENTS, formatEventDateTime } from "@/lib/data";
import { FanPageContext } from "@/components/FanPageContext";

export default async function FanRoute({ params }: { params: Promise<{ fanId: string }> }) {
  const { fanId } = await params;
  const fan = FANS_BY_ID[fanId];
  if (!fan) notFound();
  const order = findOrderByFanId(fan.id);
  const grouped = new Map<string, typeof order extends undefined ? never : NonNullable<typeof order>["lineItems"]>();
  if (order) {
    for (const li of order.lineItems) {
      const arr = grouped.get(li.eventId) ?? [];
      arr.push(li);
      grouped.set(li.eventId, arr);
    }
  }

  return (
    <div className="px-6 py-6 max-w-[1000px]">
      <FanPageContext fanId={fan.id} orderId={order?.id} />
      <h1 className="text-[22px] font-semibold mb-1">{fan.name}</h1>
      <div className="text-[12.5px] text-[color:var(--color-base-shade-300)] mb-6">
        {fan.email} · {fan.phone}
      </div>
      <h2 className="text-[14px] font-semibold mb-2">Upcoming Inventory</h2>
      {!order && <div className="text-[13px] text-[color:var(--color-base-shade-300)]">No upcoming inventory.</div>}
      {order && (
        <div className="space-y-4">
          {[...grouped.entries()].map(([eventId, items]) => {
            const ev = ALL_EVENTS[eventId];
            return (
              <div key={eventId} className="border border-[color:var(--color-border)] rounded-md p-3">
                <div className="text-[13px] font-medium mb-2">
                  {ev?.title}
                  <span className="text-[color:var(--color-base-shade-300)] font-normal ml-2">
                    {ev ? formatEventDateTime(ev.dateTime) : ""}
                  </span>
                </div>
                <div className="text-[12.5px] text-[color:var(--color-base-shade-300)]">
                  {items.length} seats · Section {items[0].section} · Row {items[0].row} · Seats{" "}
                  {items.map((i) => i.seat).join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
