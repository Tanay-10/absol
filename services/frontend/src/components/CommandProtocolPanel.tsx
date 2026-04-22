import Link from "next/link";
import {
  ALERT_PRIORITY,
  formatAbsoluteTime,
  formatCompactAmount,
  getAlertTone,
} from "@/lib/dashboard";
import type { Alert, DashboardEvent, DashboardSummary } from "@/lib/types";

interface CommandProtocolPanelProps {
  alerts: Alert[];
  summary: DashboardSummary | null;
  latestUpdateAt: string | null;
  selectedEvent: DashboardEvent | null;
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex-1 rounded-xl bg-surface-low px-4 py-3">
      <p className="label-sm opacity-50">{label}</p>
      <p className="mt-1 font-bold text-on-background">{value}</p>
    </div>
  );
}

export function CommandProtocolPanel({
  alerts,
  summary,
  latestUpdateAt,
  selectedEvent,
}: CommandProtocolPanelProps) {
  const selectedAlert =
    selectedEvent != null
      ? alerts.find((alert) => alert.event_id === selectedEvent.id) || null
      : null;
  const leadAlert =
    selectedEvent != null
      ? selectedAlert
      : [...alerts].sort(
            (left, right) =>
              ALERT_PRIORITY[right.alert_level] - ALERT_PRIORITY[left.alert_level]
          )[0] || null;

  const protocolTone = getAlertTone(leadAlert?.alert_level);
  const focusHref = selectedEvent ? `/impact?eventId=${selectedEvent.id}` : "/impact";

  return (
    <div className="surface-card p-8">
      <div className="flex items-start justify-between">
        <div>
          <span className="label-sm text-on-surface-variant opacity-60">Command Protocol</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Response Directives</h2>
        </div>
        <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${protocolTone === 'critical' ? 'badge-critical' : protocolTone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
          {leadAlert ? "Protocol Live" : "Standby"}
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-surface-low p-6">
        <div className="flex items-center gap-3">
           <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${protocolTone === 'critical' ? 'badge-critical' : protocolTone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
            {leadAlert ? leadAlert.alert_level : "Blue Watch"}
          </span>
          <span className="label-sm text-[10px] opacity-40">
            {selectedEvent ? "Focused event protocol" : "Theater-wide protocol"}
          </span>
        </div>

        <p className="mt-4 text-xl font-bold leading-tight text-on-background">
          {leadAlert?.recommended_action || "Monitor the live dashboard and hold response teams on standby."}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant opacity-70">
          {selectedEvent
            ? `${selectedEvent.title} is currently selected for drill-down and handoff into impact analysis.`
            : "Use the incident board to set focus, then hand off into impact analysis with the selected event context."}
        </p>
      </div>

      <div className="mt-6 flex gap-4">
        <StatPill label="Active Alerts" value={summary?.active_alerts ?? alerts.length} />
        <StatPill
          label="Exposure"
          value={formatCompactAmount(summary?.estimated_total_amount ?? 0)}
        />
        <StatPill
          label="Last Update"
          value={latestUpdateAt ? formatAbsoluteTime(latestUpdateAt) : "Awaiting Feed"}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href={focusHref}
          className="metallic-cta flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold transition-all"
        >
          {selectedEvent ? "Open Impact Brief" : "Impact Workspace"}
        </Link>
        <Link
          href="/pipeline"
          className="flex-1 rounded-xl bg-surface-high px-4 py-3 text-center text-sm font-bold text-on-background transition-all hover:bg-surface-highest"
        >
          View Pipeline
        </Link>
      </div>
    </div>
  );
}
