"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", hint: "Main theater", symbol: "⊡" },
  {
    href: "/impact",
    label: "Impact Analysis",
    hint: "Risk framing",
    symbol: "◬",
  },
  {
    href: "/readiness",
    label: "Readiness",
    hint: "Capacity model",
    symbol: "⊙",
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    hint: "Data health",
    symbol: "⇅",
  },
];

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-12">
      {/* Brand Identity */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xl">
          S
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-on-background">Sovereign Observer</h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant opacity-50">Enterprise Intelligence</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav aria-label="Primary navigation" className="flex-1">
        <div className="label-sm mb-6 text-on-surface-variant opacity-40">Command Center</div>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 ${
                  active 
                    ? "bg-surface-lowest text-on-background shadow-atmospheric" 
                    : "text-on-surface-variant hover:bg-surface-high hover:text-on-background"
                }`}
              >
                <span className={`text-xl ${active ? "text-primary" : "text-on-surface-variant opacity-60 group-hover:opacity-100"}`}>
                  {item.symbol}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-[10px] text-on-surface-variant opacity-60">{item.hint}</span>
                </div>
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="label-sm mt-12 mb-6 text-on-surface-variant opacity-40">System Access</div>
        <div className="space-y-1">
          <button className="group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-on-surface-variant hover:bg-surface-high hover:text-on-background transition-all">
            <span className="text-xl opacity-60 group-hover:opacity-100">⚙</span>
            <span className="text-sm font-semibold">Settings</span>
          </button>
          <button className="group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-on-surface-variant hover:bg-surface-high hover:text-on-background transition-all">
            <span className="text-xl opacity-60 group-hover:opacity-100">🔒</span>
            <span className="text-sm font-semibold">Security</span>
          </button>
        </div>
      </nav>

      {/* Operational Status */}
      <div className="mt-auto border-t border-on-surface-variant/10 pt-8">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Live Ops Feed Active</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-on-surface-variant opacity-60">
          Last synchronization at 12:42 UTC. All systems report normal latency levels.
        </p>
      </div>
    </div>
  );
}
