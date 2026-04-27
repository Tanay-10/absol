"use client";

import type { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="antialiased min-h-screen flex overflow-hidden bg-background">
      {/* SideNavBar (JSON Component) */}
      <aside className="fixed left-0 top-0 h-full w-[280px] z-50 bg-slate-50 border-r border-surface-container-high/20 hidden md:flex flex-col">
        <SidebarNav />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 ml-0 md:ml-[280px] flex flex-col h-screen overflow-hidden relative bg-surface">
        {/* TopAppBar (JSON Component) */}
        <header className="fixed top-0 right-0 z-40 w-full md:w-[calc(100%-280px)] bg-white/80 backdrop-blur-xl border-b border-surface-container-high/10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex justify-between items-center px-8 h-16 tracking-tight text-slate-900">
          {/* Left: Search */}
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm group-focus-within:text-primary transition-colors">🔍</span>
              <input 
                className="w-full bg-surface-container-low border-0 outline-none rounded-md py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary/20 transition-all ghost-border" 
                placeholder="Search events, policies, or locations..." 
                type="text"
              />
            </div>
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-4">
            <button className="bg-primary text-white hover:bg-primary-container px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 duration-200 shadow-sm hidden sm:block">
              Deploy Resource
            </button>
            <div className="flex items-center gap-2 border-l border-surface-container ml-2 pl-4">
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500 relative">
                🔔
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500">
                ⚙️
              </button>
              <div className="ml-2 w-8 h-8 rounded-full overflow-hidden border border-surface-container-high bg-primary flex items-center justify-center text-white font-bold text-xs cursor-pointer">
                BM
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto pt-24 pb-12 px-8">
           {children}
        </main>
      </div>
    </div>
  );
}
