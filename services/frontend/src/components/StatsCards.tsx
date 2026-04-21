"use client";

import type { DashboardSummary } from "@/lib/types";

interface StatsCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

function StatCard({
  label,
  value,
  color = "text-[var(--text-primary)]",
  subtext,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="surface-tier-2 ghost-border flex flex-col rounded-[24px] p-4">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className={`text-2xl font-bold mt-1 ${color}`}>{value}</span>
      {subtext && (
        <span className="mt-1 text-xs text-[var(--text-tertiary)]">{subtext}</span>
      )}
    </div>
  );
}

export function StatsCards({ summary, loading }: StatsCardsProps) {
  if (loading || !summary) {
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

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
      <StatCard
        label="Active Events"
        value={summary.total_events}
        color="text-[var(--accent-cyan)]"
        subtext="Observed across the current watch window"
      />
      <StatCard
        label="Active Alerts"
        value={summary.active_alerts}
        color={
          summary.active_alerts > 0
            ? "text-[var(--accent-coral)]"
            : "text-[var(--accent-emerald)]"
        }
        subtext={`${summary.total_alerts} total`}
      />
      <StatCard
        label="Policies Exposed"
        value={summary.total_matches}
        color="text-[var(--accent-amber)]"
        subtext={`of ${summary.total_policies} total`}
      />
      <StatCard
        label="Est. Claims"
        value={formatAmount(summary.estimated_total_amount)}
        color="text-[var(--accent-gold)]"
        subtext={`${summary.estimated_claims} claims`}
      />
    </div>
  );
}
