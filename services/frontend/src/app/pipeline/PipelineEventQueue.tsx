import { SurfaceCard } from "@/components/SurfaceCard";
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
      <SurfaceCard tone="muted" className="p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-48 rounded bg-[var(--surface-3)]" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded bg-[var(--surface-3)]" />
            ))}
          </div>
        </div>
      </SurfaceCard>
    );
  }

  const displayEvents = events.slice(0, 10);

  return (
    <SurfaceCard tone="muted" className="overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Event processing queue
        </h3>
        <span className="text-sm text-[var(--text-secondary)]">
          Showing {displayEvents.length} of {events.length} events
        </span>
      </div>

      <div className="space-y-3">
        {displayEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No events in queue
          </p>
        ) : (
          displayEvents.map((event) => (
            <div
              key={event.eventId}
              className="rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] p-4 transition-colors hover:bg-[var(--surface-3)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge tone={URGENCY_MAP[event.urgency]}>
                      {event.urgency}
                    </SeverityBadge>
                    {event.alertLevel !== "none" && (
                      <SeverityBadge tone={ALERT_LEVEL_MAP[event.alertLevel]}>
                        {event.alertLevel}
                      </SeverityBadge>
                    )}
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {event.eventFamily}
                    </span>
                  </div>
                  <h4 className="mt-2 font-semibold text-[var(--text-primary)]">
                    {event.title}
                  </h4>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono">{event.source}</span>
                    <span>·</span>
                    <span>{event.matchedDestinationIds.length} destinations</span>
                    <span>·</span>
                    <span>{event.estimatedClaims} claims</span>
                    <span>·</span>
                    <span>
                      {new Date(event.detectedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {events.length > 10 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {events.length - 10} more events not shown
          </p>
        </div>
      )}
    </SurfaceCard>
  );
}
