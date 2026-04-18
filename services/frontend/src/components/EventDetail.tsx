"use client";

import type { EventDetail as EventDetailType } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "text-blue-400",
  moderate: "text-yellow-400",
  major: "text-orange-400",
  severe: "text-red-400",
  critical: "text-purple-400",
};

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
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
        <div className="h-4 bg-slate-700 rounded w-1/3" />
      </div>
    );
  }

  if (!detail) return null;

  const { event, impact_zone, matches, estimates, alert } = detail;
  const sevColor = SEVERITY_COLORS[event.severity_label] || "text-slate-400";

  const estimateMap = new Map(estimates.map((e) => [e.exposure_match_id, e]));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 overflow-y-auto max-h-[60vh]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-50">{event.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {event.event_type}
            </span>
            <span className={`text-xs font-semibold ${sevColor}`}>
              {event.severity_label} ({event.severity_score})
            </span>
            <span className="text-xs text-slate-500">
              {event.source}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-lg"
        >
          ✕
        </button>
      </div>

      {event.summary && (
        <p className="text-sm text-slate-400 mb-4">{event.summary}</p>
      )}

      {impact_zone && (
        <div className="text-xs text-slate-500 mb-4">
          Impact: {impact_zone.zone_type}
          {impact_zone.radius_km && ` (${impact_zone.radius_km.toFixed(0)} km radius)`}
          {impact_zone.country_code && ` · ${impact_zone.country_code}`}
        </div>
      )}

      {alert && (
        <div className={`rounded-lg p-3 mb-4 ${
          alert.alert_level === "critical" ? "bg-red-500/10 border border-red-500/30" :
          alert.alert_level === "high" ? "bg-orange-500/10 border border-orange-500/30" :
          alert.alert_level === "medium" ? "bg-yellow-500/10 border border-yellow-500/30" :
          "bg-green-500/10 border border-green-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase">
              {alert.alert_level} alert
            </span>
            <span className="text-xs text-slate-400">{alert.recommended_action}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span>{alert.total_policies_affected} policies affected</span>
            <span>{alert.estimated_claim_count} est. claims</span>
            <span className="font-bold">{formatAmount(alert.estimated_total_amount)}</span>
          </div>
        </div>
      )}

      {matches.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-2">
            Affected Policies ({matches.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
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
                    <tr key={match.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 pr-3 text-slate-300">
                        {match.policies?.policy_number || match.policy_id.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-3 text-slate-400">
                        {match.policies?.policy_type || "—"}
                      </td>
                      <td className="py-2 pr-3 text-slate-400">
                        {match.policies?.policyholders?.name || "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-400">
                        {match.distance_km != null ? `${match.distance_km.toFixed(0)} km` : match.match_method}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-300">
                        {est ? `${(est.claim_probability * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-200">
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
        <p className="text-sm text-slate-500">No affected policies found.</p>
      )}
    </div>
  );
}
