"use client";

import { SeverityBadge } from "@/components/SeverityBadge";
import type { PipelineEventRow } from "@/lib/ops-types";

interface PipelineEventQueueProps {
  events: PipelineEventRow[];
  loading: boolean;
}

const URGENCY_MAP: Record<string, "low" | "medium" | "critical"> = {
  monitor: "low",
  route: "medium",
  escalate: "critical",
};

const ALERT_LEVEL_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

export function PipelineEventQueue({ events, loading }: PipelineEventQueueProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-low" />
        ))}
      </div>
    );
  }

  const displayEvents = events.slice(0, 10);

  return (
    <div className="space-y-4">
      {displayEvents.length === 0 ? (
        <p className="py-12 text-center text-on-surface-variant opacity-40 italic font-bold">
          No events currently in processing buffer.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayEvents.map((event) => (
            <div
              key={event.eventId}
              className="rounded-xl bg-surface-low p-5 transition-all hover:bg-surface-low/80"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <SeverityBadge tone={URGENCY_MAP[event.urgency]}>
                    {event.urgency}
                  </SeverityBadge>
                  {event.alertLevel !== "none" && (
                    <SeverityBadge tone={ALERT_LEVEL_MAP[event.alertLevel]}>
                      {event.alertLevel}
                    </SeverityBadge>
                  )}
                  <span className="label-sm text-[9px] text-on-surface-variant opacity-40">
                    {event.eventFamily}
                  </span>
                </div>
                
                <h4 className="text-base font-bold text-on-background leading-tight">
                  {event.title}
                </h4>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
                  <span className="font-mono">{sourceFormat(event.source)}</span>
                  <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                  <span>{event.matchedDestinationIds.length} dests</span>
                  <span className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                  <span>{event.estimatedClaims} claims</span>
                </div>
                
                <div className="text-[10px] text-on-surface-variant opacity-40">
                   Detected {new Date(event.detectedAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 10 && (
        <div className="mt-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40">
            {events.length - 10} additional events in buffer queue
          </p>
        </div>
      )}
    </div>
  );
}

function sourceFormat(source: string) {
  if (source.length > 20) return source.slice(0, 20) + '...';
  return source;
}
