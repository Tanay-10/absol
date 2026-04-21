"use client";

import Link from "next/link";
import type { Alert } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import {
  formatAbsoluteTime,
  formatCompactAmount,
  formatRelativeTime,
  getRegionLabel,
} from "@/lib/dashboard";

const LEVEL_STYLES: Record<
  string,
  {
    badgeTone: "neutral" | "medium" | "critical";
    dot: string;
    panel: string;
    label: string;
  }
> = {
  low: {
    badgeTone: "neutral",
    dot: "bg-[var(--accent-cyan)]",
    panel:
      "bg-[linear-gradient(180deg,rgba(143,214,255,0.14),rgba(143,214,255,0.04))]",
    label: "Blue watch",
  },
  medium: {
    badgeTone: "medium",
    dot: "bg-[var(--accent-amber)]",
    panel:
      "bg-[linear-gradient(180deg,rgba(242,207,141,0.16),rgba(242,207,141,0.04))]",
    label: "Amber watch",
  },
  high: {
    badgeTone: "medium",
    dot: "bg-[var(--accent-amber)]",
    panel:
      "bg-[linear-gradient(180deg,rgba(242,207,141,0.18),rgba(242,207,141,0.05))]",
    label: "Amber escalation",
  },
  critical: {
    badgeTone: "critical",
    dot: "bg-[var(--accent-violet)]",
    panel:
      "bg-[linear-gradient(180deg,rgba(201,178,255,0.18),rgba(201,178,255,0.05))]",
    label: "Critical response",
  },
};

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
  onAlertClick: (eventId: string) => void;
  selectedEventId?: string | null;
}

export function AlertFeed({
  alerts,
  loading,
  onAlertClick,
  selectedEventId,
}: AlertFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-[24px] border border-white/6 bg-white/6 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-6 py-8 text-center text-[var(--text-tertiary)]">
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
        const isSelected = selectedEventId === alert.event_id;

        return (
          <article
            key={alert.id}
            className={[
              "rounded-[24px] border border-white/6 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
              style.panel,
              isSelected ? "ring-1 ring-[var(--border-ghost-strong)]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <SeverityBadge tone={style.badgeTone}>{style.label}</SeverityBadge>
              </div>
              <p className="text-right text-xs text-[var(--text-tertiary)]">
                <span className="block">{formatRelativeTime(alert.generated_at)}</span>
                <span className="mt-1 block">{formatAbsoluteTime(alert.generated_at)}</span>
              </p>
            </div>
            <p className="mt-3 line-clamp-2 text-base font-semibold text-[var(--text-primary)]">
              {event?.title || `Event ${alert.event_id.slice(0, 8)}`}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <span>{event?.event_type || "Live event"}</span>
              <span>•</span>
              <span>{getRegionLabel(event || null)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {alert.recommended_action}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span>{alert.total_policies_affected} policies</span>
              <span>{alert.estimated_claim_count} claims</span>
              <span className="font-medium text-[var(--surface-light)]">
                {formatCompactAmount(alert.estimated_total_amount)}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAlertClick(alert.event_id)}
                className={[
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  isSelected
                    ? "bg-white/14 text-[var(--text-primary)]"
                    : "bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-[var(--text-primary)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isSelected ? "Focused in theater" : "Focus in theater"}
              </button>
              <Link
                href={`/impact?eventId=${alert.event_id}`}
                className="rounded-full border border-white/8 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-white/16 hover:text-[var(--text-primary)]"
              >
                Open impact
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
