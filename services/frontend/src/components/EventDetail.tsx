"use client";

import type { EventDetail as EventDetailType } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "text-[var(--accent-cyan)]",
  moderate: "text-[var(--accent-amber)]",
  major: "text-[var(--accent-coral)]",
  severe: "text-[var(--accent-coral)]",
  critical: "text-[var(--accent-violet)]",
};

const ALERT_BADGE_TONE = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

interface EventDetailProps {
  detail: EventDetailType | null;
  loading: boolean;
  onClose: () => void;
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function EventDetail({ detail, loading, onClose }: EventDetailProps) {
  if (!detail && !loading) return null;

  if (loading) {
    return (
      <div className="glass-panel rounded-[28px] p-6 animate-pulse">
        <div className="mb-4 h-6 w-3/4 rounded bg-white/8" />
        <div className="mb-2 h-4 w-1/2 rounded bg-white/6" />
        <div className="h-4 w-1/3 rounded bg-white/6" />
      </div>
    );
  }

  if (!detail) return null;

  const { event, impact_zone, matches, estimates, alert } = detail;
  const sevColor = SEVERITY_COLORS[event.severity_label] || "text-slate-400";

  const estimateMap = new Map(estimates.map((e) => [e.exposure_match_id, e]));

  return (
    <div className="glass-panel max-h-[60vh] overflow-y-auto rounded-[28px] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Event focus
          </p>
          <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">{event.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border-ghost)] bg-white/5 px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              {event.event_type}
            </span>
            <span className={`text-xs font-semibold ${sevColor}`}>
              {event.severity_label} ({event.severity_score})
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">{event.source}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ghost-border rounded-full px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-ghost-strong)] hover:text-[var(--text-primary)]"
        >
          Close
        </button>
      </div>

      {event.summary && (
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{event.summary}</p>
      )}

      {impact_zone && (
        <div className="mb-4 text-xs text-[var(--text-tertiary)]">
          Impact: {impact_zone.zone_type}
          {impact_zone.radius_km && ` (${impact_zone.radius_km.toFixed(0)} km radius)`}
          {impact_zone.country_code && ` · ${impact_zone.country_code}`}
        </div>
      )}

      {alert && (
        <div className="surface-tier-1 ghost-border mb-4 rounded-[24px] p-4">
          <div className="flex items-center justify-between">
            <SeverityBadge tone={ALERT_BADGE_TONE[alert.alert_level]}>
              {alert.alert_level} alert
            </SeverityBadge>
            <span className="text-xs text-[var(--text-secondary)]">{alert.recommended_action}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
            <span>{alert.total_policies_affected} policies affected</span>
            <span>{alert.estimated_claim_count} est. claims</span>
            <span className="font-bold text-[var(--surface-light)]">
              {formatAmount(alert.estimated_total_amount)}
            </span>
          </div>
        </div>
      )}

      {matches.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Affected Policies ({matches.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="subdued-table-header border-b border-[var(--border-ghost)]">
                  <th className="text-left py-2 pr-3">Policy</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Holder</th>
                  <th className="text-right py-2 pr-3">Distance</th>
                  <th className="text-right py-2 pr-3">Probability</th>
                  <th className="text-right py-2">Est. Amount</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const est = estimateMap.get(match.id);
                  return (
                    <tr
                      key={match.id}
                      className="border-b border-[rgba(148,163,184,0.1)] hover:bg-white/4"
                    >
                      <td className="py-2 pr-3 text-[var(--surface-light)]">
                        {match.policies?.policy_number || match.policy_id.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">
                        {match.policies?.policy_type || "—"}
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">
                        {match.policies?.policyholders?.name || "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">
                        {match.distance_km != null
                          ? `${match.distance_km.toFixed(0)} km`
                          : match.match_method}
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--surface-light)]">
                        {est ? `${(est.claim_probability * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="py-2 text-right font-medium text-[var(--surface-light)]">
                        {est ? formatAmount(est.estimated_amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-tertiary)]">
          No affected policies found.
        </p>
      )}
    </div>
  );
}
