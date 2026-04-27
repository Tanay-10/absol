"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", symbol: "grid_view" },
  { href: "/impact", label: "Impact Analysis", symbol: "insights" },
  { href: "/readiness", label: "Readiness", symbol: "task_alt" },
  { href: "/pipeline", label: "Pipeline", symbol: "account_tree" },
];

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col p-6 space-y-2 font-sans text-sm font-medium text-slate-900">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black">S</div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none uppercase">Sovereign</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 font-bold">Enterprise Observer</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mb-6">
        <button className="w-full bg-primary text-white hover:bg-primary-container transition-colors py-3 px-4 rounded-md flex items-center justify-center gap-2 shadow-sm font-bold uppercase tracking-widest text-[11px]">
          <span className="text-lg">+</span> New Report
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-300 ease-in-out group ${
                active 
                  ? "bg-white text-slate-900 shadow-sm font-bold" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <span className="text-xl opacity-70 group-hover:opacity-100">{getSymbol(item.symbol)}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="mt-auto space-y-1 pt-4 border-t border-surface-container-high/20">
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-md transition-all group">
          <span className="text-xl opacity-70">?</span> Support
        </button>
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-md transition-all group">
          <span className="text-xl opacity-70">@</span> Account
        </button>
      </div>
    </nav>
  );
}

function getSymbol(name: string) {
  const map: Record<string, string> = {
    grid_view: "⊞",
    insights: "◬",
    task_alt: "⊙",
    account_tree: "⇅",
  };
  return map[name] || "•";
}
