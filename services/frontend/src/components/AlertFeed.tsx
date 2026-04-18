"use client";

import type { Alert } from "@/lib/types";

const LEVEL_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  critical: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
};

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
  onAlertClick: (eventId: string) => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function AlertFeed({ alerts, loading, onAlertClick }: AlertFeedProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-lg">No alerts yet</p>
        <p className="text-sm mt-1">Run the pipeline to generate alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-24rem)]">
      {alerts.map((alert) => {
        const style = LEVEL_STYLES[alert.alert_level] || LEVEL_STYLES.low;
        const event = alert.events;
        return (
          <button
            key={alert.id}
            onClick={() => onAlertClick(alert.event_id)}
            className={`w-full text-left p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors ${style.bg}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-semibold uppercase ${style.text}`}>
                  {alert.alert_level}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {formatTime(alert.generated_at)}
              </span>
            </div>
            <p className="text-sm font-medium mt-1 text-slate-200 line-clamp-1">
              {event?.title || `Event ${alert.event_id.slice(0, 8)}`}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{alert.total_policies_affected} policies</span>
              <span>{alert.estimated_claim_count} claims</span>
              <span className="font-medium text-slate-300">
                {formatAmount(alert.estimated_total_amount)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
