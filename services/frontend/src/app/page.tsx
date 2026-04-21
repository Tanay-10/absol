"use client";

import { useCallback, useState } from "react";
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
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useDashboard();
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { alerts, loading: alertsLoading, refresh: refreshAlerts } = useAlerts();
  const { detail, loading: detailLoading } = useEventDetail(selectedEventId);

  const handlePipelineComplete = useCallback(() => {
    refreshSummary();
    refreshEvents();
    refreshAlerts();
  }, [refreshSummary, refreshEvents, refreshAlerts]);

  const handleEventSelect = useCallback((eventId: string) => {
    setSelectedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setStatus("Running live ingestion and scoring...");
    try {
      const result = await api.runPipeline();
      setStatus(
        `Pipeline complete — ${result.events_found} sourced, ${result.events_processed} promoted`
      );
      handlePipelineComplete();
    } catch (err) {
      setStatus(
        `Pipeline failed — ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(null), 8000);
    }
  }, [handlePipelineComplete]);

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        meta={
          <>
            <SeverityBadge tone="neutral">Live dashboard</SeverityBadge>
            <SeverityBadge tone="medium">Hybrid data</SeverityBadge>
          </>
        }
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap justify-end gap-3">
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
                onClick={runPipeline}
                disabled={running}
                className="metallic-cta rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? "Running pipeline..." : "Run pipeline"}
              </button>
            </div>
            {status && (
              <p className="text-sm text-[var(--text-secondary)]">{status}</p>
            )}
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
