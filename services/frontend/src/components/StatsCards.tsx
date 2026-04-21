"use client";

import type { Alert, DashboardSummary } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
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
  const toneClasses = {
    neutral:
      "bg-[linear-gradient(180deg,rgba(143,214,255,0.16),rgba(143,214,255,0.04))] text-[var(--accent-cyan)]",
    medium:
      "bg-[linear-gradient(180deg,rgba(242,207,141,0.18),rgba(242,207,141,0.04))] text-[var(--accent-amber)]",
    critical:
      "bg-[linear-gradient(180deg,rgba(201,178,255,0.2),rgba(201,178,255,0.05))] text-[var(--accent-violet)]",
  } as const;

  return (
    <div className="rounded-[26px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          {label}
        </span>
        <SeverityBadge tone={tone}>{tone === "neutral" ? "Blue" : tone === "medium" ? "Amber" : "Critical"}</SeverityBadge>
      </div>
      <span className={`mt-4 inline-flex rounded-2xl px-3 py-2 text-3xl font-semibold ${toneClasses[tone]}`}>
        {value}
      </span>
      {subtext && (
        <span className="mt-3 block text-sm leading-6 text-[var(--text-secondary)]">
          {subtext}
        </span>
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
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="ghost-border h-24 animate-pulse rounded-[24px] bg-white/6 p-4"
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
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
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
