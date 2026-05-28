"use client";

import { useRoleStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="h-14 border-b border-[color:var(--color-border)] flex items-center justify-end px-6 bg-white">
      <RoleToggle />
    </header>
  );
}

function RoleToggle() {
  const role = useRoleStore((s) => s.currentRole);
  const setRole = useRoleStore((s) => s.setRole);
  return (
    <div className="inline-flex items-center bg-[#f1f3f6] rounded-full p-0.5 text-[12.5px]">
      <button
        onClick={() => setRole("admin")}
        className={cn(
          "px-3 py-1 rounded-full font-medium",
          role === "admin"
            ? "bg-white text-[color:var(--color-base-text)] shadow-sm"
            : "text-[color:var(--color-base-shade-300)]",
        )}
      >
        Admin
      </button>
      <button
        onClick={() => setRole("sales")}
        className={cn(
          "px-3 py-1 rounded-full font-medium",
          role === "sales"
            ? "bg-white text-[color:var(--color-base-text)] shadow-sm"
            : "text-[color:var(--color-base-shade-300)]",
        )}
      >
        Sales
      </button>
    </div>
  );
}
