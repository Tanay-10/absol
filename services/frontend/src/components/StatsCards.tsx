"use client";

import type { DashboardSummary } from "@/lib/types";

interface StatsCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

function StatCard({
  label,
  value,
  color = "text-slate-50",
  subtext,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${color}`}>{value}</span>
      {subtext && <span className="text-xs text-slate-500 mt-1">{subtext}</span>}
    </div>
  );
}

export function StatsCards({ summary, loading }: StatsCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-24 animate-pulse" />
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
    <div className="grid grid-cols-4 gap-3">
      <StatCard
        label="Active Events"
        value={summary.total_events}
        color="text-blue-400"
      />
      <StatCard
        label="Active Alerts"
        value={summary.active_alerts}
        color={summary.active_alerts > 0 ? "text-red-400" : "text-green-400"}
        subtext={`${summary.total_alerts} total`}
      />
      <StatCard
        label="Policies Exposed"
        value={summary.total_matches}
        color="text-orange-400"
        subtext={`of ${summary.total_policies} total`}
      />
      <StatCard
        label="Est. Claims"
        value={formatAmount(summary.estimated_total_amount)}
        color="text-yellow-400"
        subtext={`${summary.estimated_claims} claims`}
      />
    </div>
  );
}
