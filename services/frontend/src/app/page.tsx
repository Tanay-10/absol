"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AlertFeed } from "@/components/AlertFeed";
import { CommandProtocolPanel } from "@/components/CommandProtocolPanel";
import { EventDetail } from "@/components/EventDetail";
import { PageHeader } from "@/components/PageHeader";
import { PriorityIncidents } from "@/components/PriorityIncidents";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { StatsCards } from "@/components/StatsCards";
import { EventMap } from "@/components/EventMap";
import {
  ALERT_PRIORITY,
  formatAbsoluteTime,
  formatRelativeTime,
  getAlertBreakdown,
  getAlertTone,
  getLatestDashboardTimestamp,
} from "@/lib/dashboard";
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

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const highestPriorityAlert = useMemo(
    () =>
      [...alerts].sort(
        (left, right) =>
          ALERT_PRIORITY[right.alert_level] - ALERT_PRIORITY[left.alert_level]
      )[0] || null,
    [alerts]
  );

  const breakdown = useMemo(
    () => getAlertBreakdown(summary, alerts),
    [summary, alerts]
  );

  const latestUpdateAt = useMemo(
    () => getLatestDashboardTimestamp(alerts, events),
    [alerts, events]
  );

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

  const heroState = useMemo(() => {
    const liveEvents = summary?.total_events ?? events.length;
    const criticalCount = breakdown.critical;
    const amberCount = breakdown.medium + breakdown.high;
    const blueCount = breakdown.low;
    const activeCount = summary?.active_alerts ?? breakdown.high + breakdown.critical;

    if (criticalCount > 0) {
      return {
        tone: "critical" as const,
        label: "Critical response",
        headline: `${criticalCount} critical incident${criticalCount === 1 ? "" : "s"} need executive coordination.`,
        description: `${liveEvents} live event${liveEvents === 1 ? "" : "s"} are currently in theater with ${activeCount} active response lane${activeCount === 1 ? "" : "s"}.`,
      };
    }

    if (amberCount > 0) {
      return {
        tone: "medium" as const,
        label: "Amber watch",
        headline: `${amberCount} elevated incident${amberCount === 1 ? "" : "s"} are moving through coordinated watch.`,
        description: `${liveEvents} live event${liveEvents === 1 ? "" : "s"} remain on deck while operators triage the alert queue.`,
      };
    }

    if (blueCount > 0 || liveEvents > 0) {
      return {
        tone: "neutral" as const,
        label: "Blue watch",
        headline: "Signals are live and stable across the event theater.",
        description: `${liveEvents} event${liveEvents === 1 ? "" : "s"} remain visible with low-severity monitoring in place.`,
      };
    }

    return {
      tone: "neutral" as const,
      label: "Standby",
      headline: "Awaiting the next live pipeline refresh.",
      description:
        "Run the ingestion pipeline to refresh the dashboard and seed the alert theater.",
    };
  }, [breakdown, events.length, summary]);

  const lastUpdatedCopy = latestUpdateAt
    ? `Updated ${formatRelativeTime(latestUpdateAt)} · ${formatAbsoluteTime(latestUpdateAt)}`
    : "Awaiting live refresh";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Global Event Theater"
        title="Sovereign Observer"
        description={heroState.description}
        meta={
          <>
            <SeverityBadge tone={heroState.tone}>{heroState.label}</SeverityBadge>
            <SeverityBadge tone="neutral">{lastUpdatedCopy}</SeverityBadge>
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
              <Link
                href={`/impact?eventId=${selectedEventId}`}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/14"
              >
                Open focused impact
              </Link>
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

      <SurfaceCard tone="glass" className="overflow-hidden p-0">
        <div className="grid gap-px bg-white/8 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge tone={heroState.tone}>{heroState.label}</SeverityBadge>
              <SeverityBadge tone="neutral">
                {summary?.total_events ?? events.length} live event
                {(summary?.total_events ?? events.length) === 1 ? "" : "s"}
              </SeverityBadge>
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {heroState.headline}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {selectedEvent
                ? `${heroState.description} Current focus: ${selectedEvent.title}.`
                : heroState.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Critical
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--accent-violet)]">
                  {breakdown.critical}
                </p>
              </div>
              <div className="rounded-[24px] bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Amber
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--accent-amber)]">
                  {breakdown.medium + breakdown.high}
                </p>
              </div>
              <div className="rounded-[24px] bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Last update
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--surface-light)]">
                  {lastUpdatedCopy}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Editorial focus
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {selectedEvent?.title || highestPriorityAlert?.events?.title || "Command deck standing by"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {selectedEvent
                ? "Selected incident is pinned across the theater, ready to hand off into the impact workspace."
                : highestPriorityAlert
                  ? `${highestPriorityAlert.recommended_action} while the live-alert rail continues to update.`
                  : "No priority alert is active yet. Use the pipeline run action to refresh the command deck."}
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Protocol
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  {highestPriorityAlert?.recommended_action || "Monitor live feeds"}
                </p>
              </div>
              <div className="rounded-[22px] bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Priority lane
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  {highestPriorityAlert
                    ? `${highestPriorityAlert.total_policies_affected} policies · ${highestPriorityAlert.estimated_claim_count} claims`
                    : "No alert lane active"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard tone="muted" className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Severity matrix
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              Live portfolio pulse
            </h2>
          </div>
          <SeverityBadge tone="neutral">Derived from summary + alerts</SeverityBadge>
        </div>
        <StatsCards
          summary={summary}
          alerts={alerts}
          eventsCount={events.length}
          loading={summaryLoading && alertsLoading}
        />
      </SurfaceCard>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <div className="flex min-h-0 flex-col gap-6">
          <PriorityIncidents
            alerts={alerts}
            events={events}
            loading={eventsLoading}
            selectedEventId={selectedEventId}
            onEventSelect={handleEventSelect}
          />

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
        </div>

        <div className="flex min-h-0 flex-col gap-6">
          <CommandProtocolPanel
            alerts={alerts}
            summary={summary}
            latestUpdateAt={latestUpdateAt}
            selectedEvent={selectedEvent}
          />

          <SurfaceCard tone="raised" className="flex min-h-[420px] min-h-0 flex-col p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Live-alert rail
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  Supporting watch feed
                </h2>
              </div>
              <SeverityBadge
                tone={
                  highestPriorityAlert
                    ? getAlertTone(highestPriorityAlert.alert_level)
                    : "neutral"
                }
              >
                {alerts.length > 0 ? `${alerts.length} active` : "Monitoring"}
              </SeverityBadge>
            </div>
            <div className="min-h-0 flex-1">
              <AlertFeed
                alerts={alerts}
                loading={alertsLoading}
                onAlertClick={handleEventSelect}
                selectedEventId={selectedEventId}
              />
            </div>
          </SurfaceCard>
        </div>
      </div>

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
  );
}
