"use client";

import type { Alert, DashboardSummary } from "@/lib/types";
import { formatCompactAmount, getAlertBreakdown } from "@/lib/dashboard";

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
  subtext,
}: {
  tone: "neutral" | "medium" | "critical";
  label: string;
  value: string | number;
  subtext?: string;
}) {
  const badgeClass = {
    neutral: "badge-stable",
    medium: "badge-warning",
    critical: "badge-critical",
  }[tone];

  return (
    <div className="surface-card p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="label-sm text-on-surface-variant opacity-60">
          {label}
        </span>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
          {tone === "neutral" ? "Stable" : tone === "medium" ? "Warning" : "Critical"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-on-background">
          {value}
        </span>
      </div>
      {subtext && (
        <p className="mt-4 text-xs leading-relaxed text-on-surface-variant opacity-70">
          {subtext}
        </p>
      )}
    </div>
  );
}

export function StatsCards({
  summary,
  alerts,
  eventsCount,
  loading,
}: StatsCardsProps) {
  if (loading && !summary && alerts.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="surface-card h-40 animate-pulse bg-surface-low"
          />
        ))}
      </div>
    );
  }

  const breakdown = getAlertBreakdown(summary, alerts);
  const amberCount = breakdown.medium + breakdown.high;
  const totalAlerts = summary?.total_alerts ?? alerts.length;
  const activeAlerts = summary?.active_alerts ?? breakdown.high + breakdown.critical;
  const exposureAmount =
    summary?.estimated_total_amount ??
    alerts.reduce((sum, alert) => sum + alert.estimated_total_amount, 0);
  const totalMatches =
    summary?.total_matches ??
    alerts.reduce((sum, alert) => sum + alert.total_policies_affected, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
      <StatCard
        tone="critical"
        label="Critical response"
        value={breakdown.critical}
        subtext={
          breakdown.critical > 0
            ? "Immediate executive response lanes are active."
            : "No incidents are in critical response."
        }
      />
      <StatCard
        tone="medium"
        label="Amber watch"
        value={amberCount}
        subtext={`${activeAlerts} active escalation lane${activeAlerts === 1 ? "" : "s"} under watch.`}
      />
      <StatCard
        tone="neutral"
        label="Blue watch"
        value={breakdown.low}
        subtext={`${totalAlerts} classified alert${totalAlerts === 1 ? "" : "s"} currently in the ledger.`}
      />
      <StatCard
        tone={eventsCount > 0 ? "neutral" : "medium"}
        label="Live theater"
        value={summary?.total_events ?? eventsCount}
        subtext={`${totalMatches} matched policies · ${formatCompactAmount(exposureAmount)} estimated exposure.`}
      />
    </div>
  );
}
