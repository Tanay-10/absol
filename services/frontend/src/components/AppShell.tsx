import type { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(143,214,255,0.06),transparent_42%)]" />
      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <aside className="shrink-0 p-4 sm:p-6 lg:w-[296px] lg:pr-0">
          <div className="glass-panel h-full rounded-[30px] p-4 sm:p-5">
            <SidebarNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 pt-0 sm:p-6 sm:pt-0 lg:p-8 lg:pl-6">
          <div className="content-frame flex min-h-[calc(100vh-2rem)] flex-col rounded-[34px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
