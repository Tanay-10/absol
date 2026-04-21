"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SeverityBadge } from "@/components/SeverityBadge";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", hint: "Live signals", symbol: "◉", enabled: true },
  {
    href: "/impact",
    label: "Impact Analysis",
    hint: "Exposure framing",
    symbol: "◎",
    enabled: false,
  },
  {
    href: "/readiness",
    label: "Readiness",
    hint: "Hybrid rehearsal",
    symbol: "◌",
    enabled: false,
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    hint: "Ingestion control",
    symbol: "△",
    enabled: false,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-8">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(245,235,215,0.95),rgba(183,152,102,0.92))] text-sm font-semibold text-[var(--ink-inverse)] shadow-[0_16px_36px_rgba(151,121,74,0.24)]">
            SO
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              InsureShield
            </p>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              Sovereign Observer
            </h1>
          </div>
        </div>

        <div className="surface-tier-1 ghost-border rounded-[24px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Executive command shell
            </p>
            <SeverityBadge tone="neutral">Premium UI</SeverityBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Editorial framing, asymmetrical navigation, and tonal surfaces for live portfolio monitoring.
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const className = [
            "group flex items-center justify-between rounded-[22px] px-4 py-3 transition",
            active
              ? "surface-tier-2 border border-[var(--border-ghost-strong)] text-[var(--text-primary)] shadow-[0_12px_30px_rgba(6,10,18,0.16)]"
              : item.enabled
                ? "border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-ghost)] hover:bg-white/4 hover:text-[var(--text-primary)]"
                : "border border-transparent text-[var(--text-tertiary)] opacity-70",
          ].join(" ");
          const content = (
            <>
              <div className="flex items-center gap-3">
                <span className="text-base text-[var(--accent-cyan)] transition group-hover:text-[var(--surface-light)]">
                  {item.symbol}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {item.enabled ? item.hint : "Coming soon"}
                  </p>
                </div>
              </div>
              {active ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-gold)]" />
              ) : null}
            </>
          );

          if (!item.enabled) {
            return (
              <div key={item.href} aria-disabled="true" className={className}>
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="surface-tier-1 ghost-border rounded-[24px] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Operating mode
          </p>
          <SeverityBadge tone="medium">Hybrid demo</SeverityBadge>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Live Dashboard and Impact Analysis stay event-driven while Readiness and Pipeline remain demo-backed until later tasks land.
        </p>
      </div>
    </div>
  );
}
