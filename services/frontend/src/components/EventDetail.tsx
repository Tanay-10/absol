"use client";
import type { EventDetail as EventDetailType } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatAmount, formatDateTime, formatPercent } from "@/lib/formatters";
import { deriveImpactModel } from "@/lib/impactModel";

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
}

function buildPath(points: number[]) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${index * 74 + 18} ${point}`)
    .join(" ");
}

export function EventDetail({ detail, loading }: EventDetailProps) {
  if (!detail && !loading) return null;

  if (loading) {
    return (
      <div className="glass-panel rounded-[28px] p-6 animate-pulse">
        <div className="mb-4 h-6 w-3/4 rounded bg-white/8" />
        <div className="mb-4 h-24 rounded-[24px] bg-white/6" />
        <div className="mb-4 h-60 rounded-[24px] bg-white/6" />
        <div className="h-48 rounded-[24px] bg-white/6" />
      </div>
    );
  }

  if (!detail) return null;

  const { event, impact_zone, matches, estimates, alert } = detail;
  const sevColor = SEVERITY_COLORS[event.severity_label] || "text-slate-400";
  const impactModel = deriveImpactModel(detail);
  const estimateMap = new Map(estimates.map((estimate) => [estimate.exposure_match_id, estimate]));
  const chartHeights = impactModel.trajectory.map((point) => 174 - point.share * 132);
  const chartPath = buildPath(chartHeights);

  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Impact dossier
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

        <div className="flex flex-wrap gap-2">
          <SeverityBadge tone={alert?.alert_level || "neutral"}>
            {alert ? `${alert.alert_level} alert` : "No active alert"}
          </SeverityBadge>
          <SeverityBadge tone="medium">
            {impact_zone?.country_code || event.region_name || "Global"}
          </SeverityBadge>
        </div>
      </div>

      {event.summary ? (
        <p className="mb-6 max-w-4xl text-sm text-[var(--text-secondary)]">
          {event.summary}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Alert state
          </p>
          <div className="mt-3 flex items-center gap-2">
            <SeverityBadge tone={alert ? ALERT_BADGE_TONE[alert.alert_level] : "neutral"}>
              {alert?.alert_level || "standby"}
            </SeverityBadge>
            <span className="text-xs text-[var(--text-secondary)]">
              {alert?.recommended_action || "No escalation yet"}
            </span>
          </div>
        </div>
        <div className="rounded-[24px] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Policies in zone
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
            {impactModel.policyCount}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {impact_zone?.zone_type
              ? `Impact zone: ${impact_zone.zone_type}`
              : "Derived from current exposure matches"}
          </p>
        </div>
        <div className="rounded-[24px] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Estimated claims
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
            {impactModel.estimatedClaims}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Avg probability {formatPercent(impactModel.averageProbability, 0)}
          </p>
        </div>
        <div className="rounded-[24px] bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Estimated amount
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
            {formatAmount(impactModel.estimatedAmount)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Detected {formatDateTime(event.detected_at)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[26px] bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Claim trajectory
              </p>
              <h4 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                Severity-adjusted reserve path
              </h4>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              Driven by live claims × severity pressure
            </span>
          </div>

          <svg
            viewBox="0 0 340 190"
            className="mt-6 h-[220px] w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="trajectory-stroke" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-cyan)" />
                <stop offset="100%" stopColor="var(--accent-violet)" />
              </linearGradient>
            </defs>
            {[42, 88, 134].map((gridY) => (
              <line
                key={gridY}
                x1="18"
                x2="314"
                y1={gridY}
                y2={gridY}
                stroke="rgba(148,163,184,0.14)"
                strokeDasharray="4 6"
              />
            ))}
            <path
              d={`${chartPath} L 314 174 L 18 174 Z`}
              fill="url(#trajectory-stroke)"
              opacity="0.12"
            />
            <path
              d={chartPath}
              fill="none"
              stroke="url(#trajectory-stroke)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {chartHeights.map((height, index) => (
              <circle
                key={impactModel.trajectory[index].label}
                cx={index * 74 + 18}
                cy={height}
                r="5"
                fill="var(--surface-light)"
                stroke="var(--accent-cyan)"
                strokeWidth="2"
              />
            ))}
          </svg>

          <div className="grid gap-3 md:grid-cols-5">
            {impactModel.trajectory.map((point) => (
              <div key={point.label} className="rounded-[18px] bg-white/4 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {point.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {point.claims}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatAmount(point.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Policy mix
              </p>
              <h4 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                Exposure breakdown by policy class
              </h4>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              Live mix from affected matches
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {impactModel.policyMix.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.tone }}
                    />
                    <span className="text-[var(--text-primary)]">{item.label}</span>
                  </div>
                  <span className="text-[var(--text-secondary)]">
                    {item.policies} policies · {formatPercent(item.share, 0)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(item.share * 100, 8)}%`,
                      backgroundColor: item.tone,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                  <span>{formatAmount(item.amount)} modeled loss</span>
                  <span>Avg probability {formatPercent(item.averageProbability, 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Affected policies ({matches.length})
          </h4>
          <div className="overflow-x-auto rounded-[24px] border border-[var(--border-ghost)] bg-[rgba(255,255,255,0.03)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="subdued-table-header border-b border-[var(--border-ghost)]">
                  <th className="py-2 pr-3 text-left">Policy</th>
                  <th className="py-2 pr-3 text-left">Type</th>
                  <th className="py-2 pr-3 text-left">Holder</th>
                  <th className="py-2 pr-3 text-left">Location</th>
                  <th className="py-2 pr-3 text-right">Distance</th>
                  <th className="py-2 pr-3 text-right">Probability</th>
                  <th className="py-2 text-right">Est. Amount</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const estimate = estimateMap.get(match.id);

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
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">
                        {match.insured_locations?.city ||
                          match.insured_locations?.country_code ||
                          "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">
                        {match.distance_km != null
                          ? `${match.distance_km.toFixed(0)} km`
                          : match.match_method}
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--surface-light)]">
                        {estimate ? formatPercent(estimate.claim_probability, 0) : "—"}
                      </td>
                      <td className="py-2 text-right font-medium text-[var(--surface-light)]">
                        {estimate ? formatAmount(estimate.estimated_amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--text-tertiary)]">
          No affected policies found.
        </p>
      )}
    </div>
  );
}
