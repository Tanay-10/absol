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
      <div className="space-y-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-surface-low"
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border-2 border-dashed border-surface-high p-8 text-center text-on-surface-variant opacity-40">
        <p className="font-bold">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const alert = alertByEventId.get(event.id);
        const selected = selectedEventId === event.id;

        return (
          <div
            key={event.id}
            className={`rounded-xl p-5 transition-all duration-200 ${
              selected
                ? "bg-surface-low shadow-sm ring-1 ring-primary/5"
                : "hover:bg-surface-low/50"
            }`}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityBadge tone={alert?.alert_level || "neutral"}>
                    {alert ? `${alert.alert_level} alert` : event.severity_label}
                  </SeverityBadge>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">
                    {event.event_type}
                  </span>
                  <span className="text-[10px] text-on-surface-variant opacity-40">
                    {formatDateTime(event.detected_at)}
                  </span>
                </div>
                <p className="mt-3 truncate text-lg font-bold text-on-background">
                  {event.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant opacity-60">
                  <span className="font-bold">{event.region_name || event.source}</span>
                  <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                  <span>Severity {event.severity_score}</span>
                  {alert && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                      <span className="font-bold text-on-background">{alert.estimated_claim_count} claims</span>
                      <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                      <span className="font-bold text-on-background">{formatAmount(alert.estimated_total_amount)}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEventSelect(event.id)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  selected
                    ? "bg-primary text-white"
                    : "bg-surface-high text-on-background hover:bg-surface-highest"
                }`}
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
