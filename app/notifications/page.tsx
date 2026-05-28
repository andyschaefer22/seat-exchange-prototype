"use client";

import { useStore } from "@/lib/store";
import { NotificationItem } from "@/components/NotificationItem";

export default function NotificationsPage() {
  const role = useStore((s) => s.currentRole);
  const notifications = useStore((s) => s.notifications);
  const list = notifications.filter((n) => n.forRole === role);

  return (
    <div className="px-6 py-6 max-w-[900px]">
      <h1 className="text-[22px] font-semibold mb-1">Notifications</h1>
      <div className="text-[12.5px] text-[color:var(--color-base-shade-300)] mb-5">
        {role === "admin" ? "Pending approvals and updates from Sales." : "Status updates on your submitted requests."}
      </div>
      {list.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-[13px] text-[color:var(--color-base-shade-300)]">
          No notifications.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
