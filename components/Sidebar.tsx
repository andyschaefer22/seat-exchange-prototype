"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Calendar,
  Search,
  Tag,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Shield,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useStore, unreadCountForRole } from "@/lib/store";
import { USERS } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(true);
  const pathname = usePathname();
  const role = useStore((s) => s.currentRole);
  const notifications = useStore((s) => s.notifications);
  const unread = unreadCountForRole(notifications, role);

  const user = role === "admin" ? USERS.admin : USERS.sales;

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-[color:var(--color-border)] transition-[width] duration-150",
        collapsed ? "w-[64px]" : "w-[220px]",
      )}
    >
      <div className="flex items-center justify-between px-3 h-14 border-b border-[color:var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#0E2240] to-[#005083] grid place-items-center text-white text-[10px] font-bold leading-none">
            <span>MIN</span>
          </div>
          {!collapsed && <span className="text-sm font-semibold">Timberwolves</span>}
        </div>
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
          className="text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)]"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <NavItem href="/events" icon={<Calendar size={16} />} label="Events" collapsed={collapsed} />

        {/* Search expandable group */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[color:var(--color-base-text)] hover:bg-[#f4f6f9]",
            collapsed && "justify-center",
          )}
        >
          <Search size={16} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              {searchOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </button>
        {!collapsed && searchOpen && (
          <div className="pl-9 pr-2 py-0.5">
            {[
              { href: "/fans", label: "Fans" },
              { href: "/orders", label: "Orders" },
              { href: "/payments", label: "Payments" },
              { href: "/reservations", label: "Reservations" },
              { href: "/resale", label: "Resale" },
              { href: "/sold-seats", label: "Sold Seats" },
            ].map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block py-1 px-2 text-[12.5px] rounded-sm",
                    active
                      ? "text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/8 font-medium"
                      : "text-[color:var(--color-base-shade-300)] hover:text-[color:var(--color-base-text)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <NavItem href="/offers" icon={<Tag size={16} />} label="Offers" collapsed={collapsed} />
        <NavItem href="/sales" icon={<TrendingUp size={16} />} label="Sales" collapsed={collapsed} />
        <NavItem href="/users" icon={<Users size={16} />} label="Users" collapsed={collapsed} />
        <NavItem href="/content" icon={<FileText size={16} />} label="Content" collapsed={collapsed} />
        <NavItem href="/reports" icon={<BarChart3 size={16} />} label="Reports" collapsed={collapsed} />
        <NavItem href="/admin" icon={<Shield size={16} />} label="Admin" collapsed={collapsed} />

        <NavItem
          href="/notifications"
          icon={<Bell size={16} />}
          label="Notifications"
          collapsed={collapsed}
          badge={unread > 0 ? unread : undefined}
        />

        <NavItem href="/help" icon={<HelpCircle size={16} />} label="Help" collapsed={collapsed} />
      </nav>

      <div className="border-t border-[color:var(--color-border)] p-3">
        {collapsed ? (
          <div className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] text-white text-[11px] font-semibold grid place-items-center">
            {user.name
              .split(" ")
              .map((s) => s[0])
              .join("")}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] text-white text-[11px] font-semibold grid place-items-center">
              {user.name
                .split(" ")
                .map((s) => s[0])
                .join("")}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium truncate">{user.name}</div>
              <div className="text-[11px] text-[color:var(--color-base-shade-300)] truncate">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  collapsed,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f4f6f9] relative",
        collapsed && "justify-center",
        active
          ? "text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/8 font-medium"
          : "text-[color:var(--color-base-text)]",
      )}
    >
      {icon}
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {badge !== undefined && (
        <span
          className={cn(
            "ml-auto bg-red-500 text-white text-[10px] font-semibold leading-none rounded-full grid place-items-center",
            collapsed ? "absolute top-1 right-1 w-4 h-4" : "w-4 h-4",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
