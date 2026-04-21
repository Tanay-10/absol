"use client";

import type { Alert, DashboardEvent } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDateTime, formatAmount } from "@/lib/formatters";

interface EventRowListProps {
  events: DashboardEvent[];
  alerts: Alert[];
  loading: boolean;
  selectedEventId?: string | null;
  onEventSelect: (eventId: string) => void;
  ctaLabel?: string;
  emptyMessage?: string;
}

export function EventRowList({
  events,
  alerts,
  loading,
  selectedEventId = null,
  onEventSelect,
  ctaLabel = "Open impact",
  emptyMessage = "No live events available yet.",
}: EventRowListProps) {
  const alertByEventId = new Map(alerts.map((alert) => [alert.event_id, alert]));

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-[24px] bg-white/6"
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-[var(--border-ghost)] bg-white/3 px-6 text-center text-sm text-[var(--text-tertiary)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const alert = alertByEventId.get(event.id);
        const selected = selectedEventId === event.id;

        return (
          <div
            key={event.id}
            className={[
              "ghost-border rounded-[24px] px-4 py-4 transition",
              selected
                ? "bg-white/9 shadow-[0_18px_34px_rgba(7,12,24,0.24)]"
                : "surface-tier-1 hover:bg-white/7",
            ].join(" ")}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge tone={alert?.alert_level || "neutral"}>
                    {alert ? `${alert.alert_level} alert` : event.severity_label}
                  </SeverityBadge>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    {event.event_type}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatDateTime(event.detected_at)}
                  </span>
                </div>
                <p className="mt-3 truncate text-base font-semibold text-[var(--text-primary)]">
                  {event.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                  <span>{event.region_name || event.source}</span>
                  <span>Severity {event.severity_score}</span>
                  {alert ? (
                    <>
                      <span>{alert.estimated_claim_count} modeled claims</span>
                      <span>{formatAmount(alert.estimated_total_amount)}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEventSelect(event.id)}
                className="ghost-border inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-ghost-strong)] hover:bg-white/6"
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
