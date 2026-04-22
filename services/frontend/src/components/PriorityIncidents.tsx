import Link from "next/link";
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
  const incidentRows = [...events]
    .sort((left, right) => compareIncidents(left, right, alertsByEventId))
    .slice(0, 6);

  return (
    <div className="surface-card p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="label-sm text-on-surface-variant opacity-60">Global Event Theater</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Priority Incidents</h2>
        </div>
        <div className="label-sm text-[10px] opacity-40">Showing {incidentRows.length} active threats</div>
      </div>

      {loading && incidentRows.length === 0 ? (
        <div className="space-y-6">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-32 animate-pulse rounded-2xl bg-surface-low"
            />
          ))}
        </div>
      ) : incidentRows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-surface-high p-12 text-center text-on-surface-variant opacity-50">
          Live incidents will appear here once the event feed is populated.
        </div>
      ) : (
        <div className="space-y-6">
          {incidentRows.map((event, index) => {
            const alert = alertsByEventId.get(event.id);
            const isSelected = selectedEventId === event.id;
            const impactHref = `/impact?eventId=${event.id}`;
            const tone = alert ? getAlertTone(alert.alert_level) : getEventTone(event.severity_label);

            return (
              <article
                key={event.id}
                className={`relative rounded-2xl p-6 transition-all duration-300 ${
                  isSelected 
                    ? "bg-surface-low shadow-sm" 
                    : "hover:bg-surface-low/50"
                }`}
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-bold text-on-surface-variant opacity-40">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
                        {alert ? `${alert.alert_level} alert` : event.severity_label}
                      </span>
                      <span className="label-sm text-[10px] text-on-surface-variant opacity-60">
                        {event.event_type}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-on-background leading-tight">
                      {event.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant opacity-70">
                      {event.summary ||
                        `${getRegionLabel(event)} remains under watch with severity score ${event.severity_score}.`}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
                      <span>{getRegionLabel(event)}</span>
                      <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                      <span>{formatRelativeTime(event.detected_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:w-48 lg:items-end">
                    {alert && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-on-background">
                          {formatCompactAmount(alert.estimated_total_amount)}
                        </p>
                        <p className="text-[10px] text-on-surface-variant opacity-60">
                          Est. Exposure
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEventSelect(event.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-surface-high text-on-background hover:bg-surface-highest"
                        }`}
                      >
                        {isSelected ? "Focused" : "Focus"}
                      </button>
                      <Link
                        href={impactHref}
                        className="rounded-lg border border-surface-high px-3 py-1.5 text-xs font-bold text-on-background transition-all hover:bg-surface-high"
                      >
                        Impact
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
