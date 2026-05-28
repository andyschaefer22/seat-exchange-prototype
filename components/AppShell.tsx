"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ChatButton } from "./ai-assist/ChatButton";
import { ChatPanel } from "./ai-assist/ChatPanel";
import { ToastHost } from "./ToastHost";
import { NotificationWatcher } from "./NotificationWatcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
      <ChatButton />
      <ChatPanel />
      <ToastHost />
      <NotificationWatcher />
    </div>
  );
}
