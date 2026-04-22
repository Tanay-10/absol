"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AlertFeed } from "@/components/AlertFeed";
import { CommandProtocolPanel } from "@/components/CommandProtocolPanel";
import { EventDetail } from "@/components/EventDetail";
import { PriorityIncidents } from "@/components/PriorityIncidents";
import { StatsCards } from "@/components/StatsCards";
import { EventMap } from "@/components/EventMap";
import {
  ALERT_PRIORITY,
  getAlertBreakdown,
  getAlertTone,
  getLatestDashboardTimestamp,
} from "@/lib/dashboard";
import { useDashboard } from "@/hooks/useDashboard";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { useEventDetail } from "@/hooks/useEventDetail";
import { usePipelineRun } from "@/hooks/usePipelineRun";

export default function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useDashboard();
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { alerts, loading: alertsLoading, refresh: refreshAlerts } = useAlerts();
  const { detail, loading: detailLoading } = useEventDetail(selectedEventId);
  const afterPipelineRun = useCallback(
    () => Promise.allSettled([refreshSummary(), refreshEvents(), refreshAlerts()]),
    [refreshAlerts, refreshEvents, refreshSummary]
  );
  const { run, running: pipelineRunning, buttonLabel } =
    usePipelineRun(afterPipelineRun);

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

  const handleEventSelect = useCallback(
    (eventId: string) => {
      setSelectedEventId((prev) => (prev === eventId ? null : eventId));
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const heroState = useMemo(() => {
    const criticalCount = breakdown.critical;
    const amberCount = breakdown.medium + breakdown.high;

    if (criticalCount > 0) {
      return {
        tone: "critical" as const,
        label: "Critical response",
        headline: `${criticalCount} critical incident${criticalCount === 1 ? "" : "s"} need executive coordination.`,
      };
    }

    if (amberCount > 0) {
      return {
        tone: "medium" as const,
        label: "Amber watch",
        headline: `${amberCount} elevated incident${amberCount === 1 ? "" : "s"} are moving through coordinated watch.`,
      };
    }

    return {
      tone: "neutral" as const,
      label: "Blue watch",
      headline: "Signals are live and stable across the event theater.",
    };
  }, [breakdown]);

  return (
    <div className="flex flex-col gap-10 py-4">
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
             <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${heroState.tone === 'critical' ? 'badge-critical' : heroState.tone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
              {heroState.label}
            </span>
            <span className="label-sm opacity-40">System Live</span>
          </div>
          <h1 className="display-lg text-on-background">
            {heroState.headline}
          </h1>
          <p className="mt-6 text-xl text-on-surface-variant opacity-70 leading-relaxed">
            Real-time exposure framing and automated catastrophe intelligence for global insurance operations.
          </p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <button
            type="button"
            onClick={() => void run()}
            disabled={pipelineRunning}
            className="metallic-cta min-w-[200px] rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all disabled:opacity-50"
          >
            {buttonLabel}
          </button>
          <p className="label-sm text-[10px] opacity-40">Last pulse: {latestUpdateAt ? new Date(latestUpdateAt).toLocaleTimeString() : 'Awaiting...'}</p>
        </div>
      </section>

      {/* Stats Overview */}
      <section>
        <StatsCards
          summary={summary}
          alerts={alerts}
          eventsCount={events.length}
          loading={summaryLoading && alertsLoading}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Incidents & Map */}
        <div className="xl:col-span-8 space-y-10">
          <PriorityIncidents
            alerts={alerts}
            events={events}
            loading={eventsLoading}
            selectedEventId={selectedEventId}
            onEventSelect={handleEventSelect}
          />

          <div className="surface-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="label-sm text-on-surface-variant opacity-60">Global Event Layer</span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Live Catastrophe Map</h2>
              </div>
              <div className="flex gap-2">
                <button className="label-sm bg-surface-low px-4 py-2 rounded-lg text-[10px]">Filter: Active Only</button>
                <button className="label-sm bg-surface-low px-4 py-2 rounded-lg text-[10px]">Layer: Policy Density</button>
              </div>
            </div>
            <div className="h-[500px] rounded-2xl overflow-hidden ghost-border relative">
               <EventMap
                events={events}
                selectedEventId={selectedEventId}
                impactZone={null}
                onEventSelect={handleEventSelect}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Protocols & Feed */}
        <div className="xl:col-span-4 space-y-10">
          <CommandProtocolPanel
            alerts={alerts}
            summary={summary}
            latestUpdateAt={latestUpdateAt}
            selectedEvent={selectedEvent}
          />

          <div className="surface-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="label-sm text-on-surface-variant opacity-60">Live-Alert Rail</span>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-on-background">Operational Stream</h2>
              </div>
              <span className="badge-stable rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                {alerts.length} Active
              </span>
            </div>
            <div className="h-[600px] overflow-y-auto pr-4 -mr-4 scrollbar-hide">
              <AlertFeed
                alerts={alerts}
                loading={alertsLoading}
                onAlertClick={handleEventSelect}
                selectedEventId={selectedEventId}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedEventId && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-8 glass-overlay border-t border-on-surface-variant/10 animate-in slide-in-from-bottom duration-500">
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
