"use client";

import type { Alert, DashboardSummary } from "@/lib/types";
import { getAlertBreakdown } from "@/lib/dashboard";

interface StatsCardsProps {
  summary: DashboardSummary | null;
  alerts: Alert[];
  eventsCount: number;
  loading: boolean;
}

function StatCard({
  tone,
  label,
  value,
  icon,
  badgeLabel,
  sparklineColor,
}: {
  tone: "critical" | "high" | "medium" | "neutral";
  label: string;
  value: string | number;
  icon: string;
  badgeLabel: string;
  sparklineColor: string;
}) {
  const badgeClass = {
    critical: "badge-critical",
    high: "badge-warning",
    medium: "badge-stable",
    neutral: "text-on-surface-variant bg-surface-container",
  }[tone];

  const borderClass = {
    critical: "bg-error",
    high: "bg-tertiary",
    medium: "bg-secondary",
    neutral: "bg-primary-fixed-dim",
  }[tone];

  const iconContainerClass = {
    critical: "bg-error-container text-on-error-container",
    high: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    medium: "bg-secondary-fixed text-on-secondary-fixed-variant",
    neutral: "bg-primary-fixed text-on-primary-fixed",
  }[tone];

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border atmospheric-shadow flex flex-col relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1 h-full ${borderClass}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${iconContainerClass}`}>
           <span className="text-xl font-bold">{icon}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
      <h3 className="text-3xl font-bold text-on-background -tracking-wide">{value}</h3>
      <p className="text-[10px] text-on-surface-variant font-medium mt-1 uppercase tracking-widest">{label}</p>
      
      {/* Mini Sparkline */}
      <div className="mt-4 h-8 flex items-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
        {[2, 3, 2, 5, 4, 6].map((h, i) => (
          <div 
            key={i} 
            className={`w-1/6 ${sparklineColor} rounded-t-sm`} 
            style={{ height: `${(h/6)*100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function StatsCards({
  summary,
  alerts,
  eventsCount,
  loading,
}: StatsCardsProps) {
  const breakdown = getAlertBreakdown(summary, alerts);

  if (loading && !summary && alerts.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 rounded-xl bg-surface-container-low animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <StatCard
        tone="critical"
        label="Active Alerts"
        value={breakdown.critical}
        icon="!"
        badgeLabel="Critical"
        sparklineColor="bg-error"
      />
      <StatCard
        tone="high"
        label="Monitored Zones"
        value={breakdown.high + breakdown.medium}
        icon="^"
        badgeLabel="High"
        sparklineColor="bg-tertiary"
      />
      <StatCard
        tone="medium"
        label="Watchlist Items"
        value={breakdown.low}
        icon="i"
        badgeLabel="Medium"
        sparklineColor="bg-secondary"
      />
      <StatCard
        tone="neutral"
        label="Field Operatives"
        value={eventsCount * 3 + 12}
        icon="G"
        badgeLabel="Active Units"
        sparklineColor="bg-primary"
      />
    </div>
  );
}
