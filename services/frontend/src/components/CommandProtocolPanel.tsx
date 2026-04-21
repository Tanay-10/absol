import Link from "next/link";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
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
    <div className="rounded-[22px] bg-white/6 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export function CommandProtocolPanel({
  alerts,
  summary,
  latestUpdateAt,
  selectedEvent,
}: CommandProtocolPanelProps) {
  const leadAlert =
    selectedEvent && alerts.find((alert) => alert.event_id === selectedEvent.id)
      ? alerts.find((alert) => alert.event_id === selectedEvent.id) || null
      : [...alerts].sort(
            (left, right) =>
              ALERT_PRIORITY[right.alert_level] - ALERT_PRIORITY[left.alert_level]
          )[0] || null;

  const protocolTone = getAlertTone(leadAlert?.alert_level);
  const focusHref = selectedEvent ? `/impact?eventId=${selectedEvent.id}` : "/impact";

  return (
    <SurfaceCard tone="glass" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Command protocol
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Response directives
          </h2>
        </div>
        <SeverityBadge tone={protocolTone}>
          {leadAlert ? "Protocol live" : "Standby"}
        </SeverityBadge>
      </div>

      <div className="mt-5 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge tone={protocolTone}>
            {leadAlert ? leadAlert.alert_level : "Blue watch"}
          </SeverityBadge>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {selectedEvent ? "Focused event protocol" : "Theater-wide protocol"}
          </span>
        </div>

        <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
          {leadAlert?.recommended_action || "Monitor the live dashboard and hold response teams on standby."}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {selectedEvent
            ? `${selectedEvent.title} is currently selected for drill-down and handoff into impact analysis.`
            : "Use the incident board to set focus, then hand off into impact analysis with the selected event context."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatPill label="Active alerts" value={summary?.active_alerts ?? alerts.length} />
        <StatPill
          label="Exposure"
          value={formatCompactAmount(summary?.estimated_total_amount ?? 0)}
        />
        <StatPill
          label="Last update"
          value={latestUpdateAt ? formatAbsoluteTime(latestUpdateAt) : "Awaiting feed"}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={focusHref}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/14"
        >
          {selectedEvent ? "Open focused impact brief" : "Open impact workspace"}
        </Link>
        <Link
          href="/pipeline"
          className="rounded-full border border-white/8 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-white/16 hover:text-[var(--text-primary)]"
        >
          Open pipeline
        </Link>
      </div>
    </SurfaceCard>
  );
}
