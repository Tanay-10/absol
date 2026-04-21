"use client";

import type { Alert } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";

const LEVEL_STYLES: Record<
  string,
  { badgeTone: "low" | "medium" | "high" | "critical"; dot: string }
> = {
  low: { badgeTone: "low", dot: "bg-[var(--accent-emerald)]" },
  medium: { badgeTone: "medium", dot: "bg-[var(--accent-amber)]" },
  high: { badgeTone: "high", dot: "bg-[var(--accent-coral)]" },
  critical: { badgeTone: "critical", dot: "bg-[var(--accent-violet)]" },
};

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
  onAlertClick: (eventId: string) => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function AlertFeed({ alerts, loading, onAlertClick }: AlertFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[22px] bg-white/6 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border-ghost)] bg-white/3 px-6 py-8 text-center text-[var(--text-tertiary)]">
        <p className="text-lg">No alerts yet</p>
        <p className="mt-1 text-sm">Run the pipeline to generate alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto pr-1">
      {alerts.map((alert) => {
        const style = LEVEL_STYLES[alert.alert_level] || LEVEL_STYLES.low;
        const event = alert.events;
        return (
          <button
            key={alert.id}
            onClick={() => onAlertClick(alert.event_id)}
            className="surface-tier-1 ghost-border w-full rounded-[22px] p-4 text-left transition hover:border-[var(--border-ghost-strong)] hover:bg-white/8"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <SeverityBadge tone={style.badgeTone}>{alert.alert_level}</SeverityBadge>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                {formatTime(alert.generated_at)}
              </span>
            </div>
            <p className="mt-3 line-clamp-1 text-sm font-medium text-[var(--text-primary)]">
              {event?.title || `Event ${alert.event_id.slice(0, 8)}`}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span>{alert.total_policies_affected} policies</span>
              <span>{alert.estimated_claim_count} claims</span>
              <span className="font-medium text-[var(--surface-light)]">
                {formatAmount(alert.estimated_total_amount)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
