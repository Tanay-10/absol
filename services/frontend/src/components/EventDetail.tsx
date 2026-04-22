"use client";
import type { EventDetail as EventDetailType } from "@/lib/types";
import { formatAmount, formatDateTime, formatPercent } from "@/lib/formatters";
import { deriveImpactModel } from "@/lib/impactModel";

interface EventDetailProps {
  detail: EventDetailType | null;
  loading: boolean;
  onClose?: () => void;
}

function buildPath(points: number[]) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${index * 74 + 18} ${point}`)
    .join(" ");
}

export function EventDetail({ detail, loading, onClose }: EventDetailProps) {
  if (!detail && !loading) return null;

  if (loading) {
    return (
      <div className="surface-card p-8 animate-pulse">
        <div className="mb-4 h-6 w-3/4 rounded bg-surface-low" />
        <div className="mb-4 h-24 rounded-2xl bg-surface-low" />
        <div className="mb-4 h-60 rounded-2xl bg-surface-low" />
        <div className="h-48 rounded-2xl bg-surface-low" />
      </div>
    );
  }

  if (!detail) return null;

  const { event, matches, estimates, alert } = detail;
  const impactModel = deriveImpactModel(detail);
  const estimateMap = new Map(estimates.map((estimate) => [estimate.exposure_match_id, estimate]));
  const chartHeights = impactModel.trajectory.map((point) => 174 - point.share * 132);
  const chartPath = buildPath(chartHeights);

  const tone = alert ? alert.alert_level : 'neutral';

  return (
    <div className="surface-card p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="label-sm text-on-surface-variant opacity-60">Impact Dossier</span>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-on-background">{event.title}</h3>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-surface-low px-3 py-1 text-xs font-bold text-on-background">
              {event.event_type}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' || tone === 'high' ? 'badge-warning' : 'badge-stable'}`}>
              {event.severity_label} ({event.severity_score})
            </span>
            <span className="text-xs text-on-surface-variant opacity-60">{event.source}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-surface-high px-4 py-2 text-xs font-bold text-on-background transition-all hover:bg-surface-high"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {event.summary && (
        <p className="mb-8 max-w-4xl text-base leading-relaxed text-on-surface-variant opacity-80">
          {event.summary}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-surface-low p-6">
          <p className="label-sm text-[10px] opacity-40 mb-3">Alert State</p>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' || tone === 'high' ? 'badge-warning' : 'badge-stable'}`}>
              {alert?.alert_level || "standby"}
            </span>
            <span className="text-xs font-bold text-on-background truncate">
              {alert?.recommended_action || "No escalation yet"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-surface-low p-6">
          <p className="label-sm text-[10px] opacity-40 mb-1">Policies in Zone</p>
          <p className="text-3xl font-bold">{impactModel.policyCount}</p>
        </div>
        <div className="rounded-2xl bg-surface-low p-6">
          <p className="label-sm text-[10px] opacity-40 mb-1">Estimated Claims</p>
          <p className="text-3xl font-bold">{impactModel.estimatedClaims}</p>
        </div>
        <div className="rounded-2xl bg-surface-low p-6">
          <p className="label-sm text-[10px] opacity-40 mb-1">Estimated Amount</p>
          <p className="text-3xl font-bold">{formatAmount(impactModel.estimatedAmount)}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-2xl bg-surface-low p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="label-sm text-[10px] opacity-40">Claim Trajectory</span>
              <h4 className="mt-1 text-lg font-bold text-on-background">Severity-Adjusted Reserve Path</h4>
            </div>
          </div>

          <svg
            viewBox="0 0 340 190"
            className="h-[220px] w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="trajectory-stroke" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="var(--on-background)" />
                <stop offset="100%" stopColor="#45464d" />
              </linearGradient>
            </defs>
            {[42, 88, 134].map((gridY) => (
              <line
                key={gridY}
                x1="18"
                x2="314"
                y1={gridY}
                y2={gridY}
                stroke="rgba(0,0,0,0.05)"
                strokeDasharray="4 6"
              />
            ))}
            <path
              d={`${chartPath} L 314 174 L 18 174 Z`}
              fill="var(--on-background)"
              opacity="0.03"
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
                r="4"
                fill="white"
                stroke="var(--on-background)"
                strokeWidth="2"
              />
            ))}
          </svg>

          <div className="grid grid-cols-5 gap-3 mt-8">
            {impactModel.trajectory.map((point) => (
              <div key={point.label} className="text-center">
                <p className="label-sm text-[9px] opacity-40">{point.label}</p>
                <p className="mt-1 font-bold text-sm">{point.claims}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 rounded-2xl bg-surface-low p-8">
          <div className="mb-8">
            <span className="label-sm text-[10px] opacity-40">Policy Mix</span>
            <h4 className="mt-1 text-lg font-bold text-on-background">Exposure Breakdown</h4>
          </div>

          <div className="space-y-6">
            {impactModel.policyMix.map((item) => (
              <div key={item.label}>
                <div className="mb-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.tone === 'var(--accent-cyan)' ? '#000000' : item.tone }}
                    />
                    <span className="font-bold">{item.label}</span>
                  </div>
                  <span className="opacity-60">{item.policies} policies ({formatPercent(item.share, 0)})</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.max(item.share * 100, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-on-background uppercase tracking-wider opacity-40">
              Affected Policies ({matches.length})
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left label-sm opacity-40 border-b border-surface-high">
                  <th className="pb-4 pr-3">Policy</th>
                  <th className="pb-4 pr-3">Type</th>
                  <th className="pb-4 pr-3">Holder</th>
                  <th className="pb-4 pr-3 text-right">Probability</th>
                  <th className="pb-4 text-right">Est. Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-low">
                {matches.map((match) => {
                  const estimate = estimateMap.get(match.id);
                  return (
                    <tr
                      key={match.id}
                      className="group transition-colors hover:bg-surface-low/50"
                    >
                      <td className="py-4 pr-3 font-bold">
                        {match.policies?.policy_number || match.policy_id.slice(0, 8)}
                      </td>
                      <td className="py-4 pr-3 text-on-surface-variant opacity-70">
                        {match.policies?.policy_type || "—"}
                      </td>
                      <td className="py-4 pr-3 text-on-surface-variant opacity-70">
                        {match.policies?.policyholders?.name || "—"}
                      </td>
                      <td className="py-4 pr-3 text-right font-bold">
                        {estimate ? formatPercent(estimate.claim_probability, 0) : "—"}
                      </td>
                      <td className="py-4 text-right font-bold">
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
        <p className="mt-10 text-sm text-on-surface-variant opacity-40 text-center py-8 border-2 border-dashed border-surface-high rounded-2xl">
          No affected policies found for this event focus.
        </p>
      )}
    </div>
  );
}
