import Link from "next/link";
import { ORDERS, FANS_BY_ID } from "@/lib/data";

export default function OrdersList() {
  return (
    <div className="px-6 py-6 max-w-[1100px]">
      <h1 className="text-[22px] font-semibold mb-4">Orders</h1>
      <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f7f9fb] text-[11.5px] uppercase text-[color:var(--color-base-shade-300)]">
            <tr>
              <th className="text-left px-3 py-2">Order ID</th>
              <th className="text-left px-3 py-2">Fan</th>
              <th className="text-left px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.id} className="border-t border-[color:var(--color-border)] hover:bg-[#fafbfc]">
                <td className="px-3 py-2">
                  <Link href={`/orders/${o.id}`} className="text-[color:var(--color-primary)] font-medium hover:underline">
                    {o.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{FANS_BY_ID[o.fanId].name}</td>
                <td className="px-3 py-2 text-[color:var(--color-base-shade-300)]">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
