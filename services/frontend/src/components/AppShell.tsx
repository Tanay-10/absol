import type { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-surface">
      <div className="flex min-h-screen">
        {/* Asymmetrical Sidebar */}
        <aside className="w-72 shrink-0 bg-surface-low p-6 lg:p-8">
          <SidebarNav />
        </aside>

        {/* Main Workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="flex h-20 items-center justify-between px-8 py-4">
            <div className="flex items-center gap-8">
              <span className="label-sm text-on-surface-variant opacity-60">Enterprise Ops</span>
              <nav className="flex gap-6">
                <button className="label-sm border-b-2 border-primary pb-1 text-on-background">Live Stream</button>
                <button className="label-sm pb-1 text-on-surface-variant hover:text-on-background transition-colors">Historical</button>
                <button className="label-sm pb-1 text-on-surface-variant hover:text-on-background transition-colors">Reports</button>
              </nav>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="w-64 rounded-full bg-surface-high px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-background">
                🔔
              </div>
              <div className="flex items-center gap-3 border-l border-on-surface-variant/10 pl-6">
                <div className="text-right">
                  <p className="text-sm font-semibold">B. Mahto</p>
                  <p className="text-xs text-on-surface-variant">Director of Risk</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  BM
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-8 pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
