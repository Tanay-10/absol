import Link from "next/link";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import {
  ALERT_PRIORITY,
  compareIncidents,
  formatAbsoluteTime,
  formatCompactAmount,
  formatRelativeTime,
  getAlertTone,
  getEventTone,
  getRegionLabel,
} from "@/lib/dashboard";
import type { Alert, DashboardEvent } from "@/lib/types";

interface PriorityIncidentsProps {
  alerts: Alert[];
  events: DashboardEvent[];
  loading: boolean;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export function PriorityIncidents({
  alerts,
  events,
  loading,
  selectedEventId,
  onEventSelect,
}: PriorityIncidentsProps) {
  const alertsByEventId = new Map(alerts.map((alert) => [alert.event_id, alert]));
  const topAlert =
    [...alerts].sort(
      (left, right) =>
        ALERT_PRIORITY[right.alert_level] - ALERT_PRIORITY[left.alert_level]
    )[0] || null;
  const incidentRows = [...events]
    .sort((left, right) => compareIncidents(left, right, alertsByEventId))
    .slice(0, 6);

  return (
    <SurfaceCard tone="muted" className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Priority incidents
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Global event theater
          </h2>
        </div>
        <SeverityBadge tone={topAlert ? getAlertTone(topAlert.alert_level) : "neutral"}>
          {topAlert ? "Live queue" : "Standing watch"}
        </SeverityBadge>
      </div>

      {loading && incidentRows.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-36 animate-pulse rounded-[24px] border border-white/6 bg-white/6"
            />
          ))}
        </div>
      ) : incidentRows.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/8 bg-white/3 px-6 py-10 text-center text-[var(--text-tertiary)]">
          Live incidents will appear here once the event feed is populated.
        </div>
      ) : (
        <div className="space-y-3">
          {incidentRows.map((event, index) => {
            const alert = alertsByEventId.get(event.id);
            const isSelected = selectedEventId === event.id;
            const impactHref = `/impact?eventId=${event.id}`;

            return (
              <article
                key={event.id}
                className={[
                  "rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
                  isSelected ? "ring-1 ring-[var(--border-ghost-strong)]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/7 px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                      <SeverityBadge tone={alert ? getAlertTone(alert.alert_level) : getEventTone(event.severity_label)}>
                        {alert ? `${alert.alert_level} alert` : event.severity_label}
                      </SeverityBadge>
                      <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {event.event_type}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                      {event.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {event.summary ||
                        `${getRegionLabel(event)} remains under watch with severity score ${event.severity_score}.`}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      <span>{getRegionLabel(event)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(event.detected_at)}</span>
                      <span>•</span>
                      <span>{formatAbsoluteTime(event.detected_at)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>Severity {event.severity_score}</span>
                      {alert ? (
                        <>
                          <span>{alert.total_policies_affected} policies</span>
                          <span>{alert.estimated_claim_count} claims</span>
                          <span className="font-medium text-[var(--surface-light)]">
                            {formatCompactAmount(alert.estimated_total_amount)}
                          </span>
                        </>
                      ) : (
                        <span>Awaiting generated alert for impact estimates.</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:justify-end">
                    <button
                      type="button"
                      onClick={() => onEventSelect(event.id)}
                      className={[
                        "rounded-full px-3.5 py-2 text-sm font-medium transition",
                        isSelected
                          ? "bg-white/14 text-[var(--text-primary)]"
                          : "bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-[var(--text-primary)]",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {isSelected ? "Focused in map" : "Focus in map"}
                    </button>
                    <Link
                      href={impactHref}
                      className="rounded-full border border-white/8 px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-white/16 hover:text-[var(--text-primary)]"
                    >
                      Open impact
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SurfaceCard>
  );
}
