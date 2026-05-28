"use client";

import { useEffect, useRef } from "react";
import { useStore, useRoleStore } from "@/lib/store";
import { useToasts } from "./ToastHost";
import { useRouter } from "next/navigation";

// Watches notifications for the current role and pops a toast when new ones arrive
// (only after the watcher mounts).
export function NotificationWatcher() {
  const role = useRoleStore((s) => s.currentRole);
  const notifications = useStore((s) => s.notifications);
  const lastIds = useRef<Set<string> | null>(null);
  const pushToast = useToasts((s) => s.push);
  const router = useRouter();

  useEffect(() => {
    const currentForRole = notifications.filter((n) => n.forRole === role);
    if (lastIds.current === null) {
      lastIds.current = new Set(currentForRole.map((n) => n.id));
      return;
    }
    for (const n of currentForRole) {
      if (!lastIds.current.has(n.id)) {
        pushToast({
          title: n.title,
          body: n.body,
          action: { label: "Review", onClick: () => router.push("/notifications") },
        });
      }
    }
    lastIds.current = new Set(currentForRole.map((n) => n.id));
  }, [notifications, role, pushToast, router]);

  // Reset tracking when role changes (so switching roles doesn't toast historical items)
  useEffect(() => {
    lastIds.current = null;
  }, [role]);

  return null;
}
