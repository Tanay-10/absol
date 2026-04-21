"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { StatsCards } from "@/components/StatsCards";
import { EventMap } from "@/components/EventMap";
import { AlertFeed } from "@/components/AlertFeed";
import { EventDetail } from "@/components/EventDetail";
import { useDashboard } from "@/hooks/useDashboard";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { useEventDetail } from "@/hooks/useEventDetail";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<{
    tone: "low" | "medium" | "high";
    message: string;
  } | null>(null);

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useDashboard();
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { alerts, loading: alertsLoading, refresh: refreshAlerts } = useAlerts();
  const { detail, loading: detailLoading } = useEventDetail(selectedEventId);

  const handleEventSelect = useCallback((eventId: string) => {
    setSelectedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const handlePipelineRun = useCallback(async () => {
    setPipelineRunning(true);
    setPipelineStatus({ tone: "medium", message: "Running pipeline..." });

    try {
      const result = await api.runPipeline();
      await Promise.allSettled([refreshSummary(), refreshEvents(), refreshAlerts()]);
      setPipelineStatus({
        tone: "low",
        message: `${result.events_found} events found, ${result.events_processed} processed`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown pipeline error";
      setPipelineStatus({
        tone: "high",
        message: `Pipeline failed: ${message}`,
      });
    } finally {
      setPipelineRunning(false);
    }
  }, [refreshAlerts, refreshEvents, refreshSummary]);

  const pipelineButtonLabel = useMemo(
    () => (pipelineRunning ? "Running pipeline..." : "Run pipeline"),
    [pipelineRunning]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Command deck"
        title="Sovereign Observer"
        description="Track live catastrophe movement, interpret portfolio exposure, and coordinate response from one operational frame."
        meta={
          <>
            <SeverityBadge tone="neutral">Live dashboard</SeverityBadge>
            <SeverityBadge tone="medium">Hybrid data</SeverityBadge>
          </>
        }
        actions={
          <div className="flex flex-wrap justify-end gap-3">
            {pipelineStatus && (
              <SeverityBadge tone={pipelineStatus.tone}>
                {pipelineStatus.message}
              </SeverityBadge>
            )}
            {selectedEventId && (
              <button
                type="button"
                onClick={handleCloseDetail}
                className="ghost-border rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-ghost-strong)] hover:text-[var(--text-primary)]"
              >
                Clear focus
              </button>
            )}
            <button
              type="button"
              onClick={() => void handlePipelineRun()}
              disabled={pipelineRunning}
              className="rounded-full bg-[linear-gradient(135deg,rgba(245,235,215,0.95),rgba(183,152,102,0.92))] px-4 py-2 text-sm font-semibold text-[var(--ink-inverse)] shadow-[0_16px_36px_rgba(151,121,74,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pipelineButtonLabel}
            </button>
          </div>
        }
      />

      <SurfaceCard tone="muted" className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Portfolio pulse
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              Exposure snapshot
            </h2>
          </div>
          <SeverityBadge tone="neutral">Rolling 30s refresh</SeverityBadge>
        </div>
        <StatsCards summary={summary} loading={summaryLoading} />
      </SurfaceCard>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_380px]">
        <div className="flex min-h-0 flex-col gap-6">
          <SurfaceCard tone="glass" className="flex min-h-[420px] flex-1 flex-col p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Global event layer
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  Live catastrophe map
                </h2>
              </div>
              <SeverityBadge tone={selectedEventId ? "medium" : "neutral"}>
                {selectedEventId ? "Focused event" : "Global sweep"}
              </SeverityBadge>
            </div>
            <div className="min-h-0 flex-1">
              {eventsLoading ? (
                <div className="h-full w-full animate-pulse rounded-[24px] bg-white/6" />
              ) : (
                <EventMap
                  events={events}
                  selectedEventId={selectedEventId}
                  impactZone={detail?.impact_zone || null}
                  onEventSelect={handleEventSelect}
                />
              )}
            </div>
          </SurfaceCard>

          {selectedEventId && (
            <div className="max-h-[42vh] overflow-hidden">
              <EventDetail
                detail={detail}
                loading={detailLoading}
                onClose={handleCloseDetail}
              />
            </div>
          )}
        </div>

        <SurfaceCard tone="raised" className="flex min-h-[420px] min-h-0 flex-col p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                Alert ledger
              </p>
              <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                Triage queue
              </h2>
            </div>
            <SeverityBadge tone={alerts.length > 0 ? "high" : "neutral"}>
              {alerts.length > 0 ? `${alerts.length} active` : "Monitoring"}
            </SeverityBadge>
          </div>
          <div className="min-h-0 flex-1">
            <AlertFeed
              alerts={alerts}
              loading={alertsLoading}
              onAlertClick={handleEventSelect}
            />
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
