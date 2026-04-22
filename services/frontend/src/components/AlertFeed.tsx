"use client";

import Link from "next/link";
import type { Alert } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import {
  formatAbsoluteTime,
  formatCompactAmount,
  formatRelativeTime,
  getRegionLabel,
} from "@/lib/dashboard";

const LEVEL_LABELS: Record<string, string> = {
  low: "Blue watch",
  medium: "Amber watch",
  high: "Amber escalation",
  critical: "Critical response",
};

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
  onAlertClick: (eventId: string) => void;
  selectedEventId?: string | null;
}

export function AlertFeed({
  alerts,
  loading,
  onAlertClick,
  selectedEventId,
}: AlertFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-surface-low animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-high p-8 text-center text-on-surface-variant opacity-40">
        <p className="text-lg font-bold">No alerts yet</p>
        <p className="mt-2 text-sm">Run the pipeline to generate alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alerts.map((alert) => {
        const label = LEVEL_LABELS[alert.alert_level] || LEVEL_LABELS.low;
        const event = alert.events;
        const isSelected = selectedEventId === alert.event_id;

        return (
          <article
            key={alert.id}
            className={`group rounded-2xl p-6 transition-all duration-300 ${
              isSelected ? "bg-surface-low shadow-sm ring-1 ring-primary/5" : "hover:bg-surface-low/50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <SeverityBadge tone={alert.alert_level as any}>{label}</SeverityBadge>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">
                  {formatRelativeTime(alert.generated_at)} · {formatAbsoluteTime(alert.generated_at)}
                </span>
              </div>
            </div>

            <p className="mt-4 text-lg font-bold leading-tight text-on-background group-hover:text-primary transition-colors cursor-pointer" onClick={() => onAlertClick(alert.event_id)}>
              {event?.title || `Event ${alert.event_id.slice(0, 8)}`}
            </p>
            
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
              <span>{event?.event_type || "Live event"}</span>
              <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
              <span>{getRegionLabel(event || null)}</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant opacity-70">
              {alert.recommended_action}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-on-surface-variant/5 pt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">Exposure</span>
                <span className="text-sm font-bold">{formatCompactAmount(alert.estimated_total_amount)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">Policies</span>
                <span className="text-sm font-bold">{alert.total_policies_affected}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => onAlertClick(alert.event_id)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-surface-high text-on-background hover:bg-surface-highest"
                }`}
              >
                {isSelected ? "Focused" : "Focus"}
              </button>
              <Link
                href={`/impact?eventId=${alert.event_id}`}
                className="flex-1 rounded-lg border border-surface-high px-3 py-2 text-center text-xs font-bold text-on-background transition-all hover:bg-surface-high"
              >
                Impact
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
