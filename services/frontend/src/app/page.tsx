"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AlertFeed } from "@/components/AlertFeed";
import { EventDetail } from "@/components/EventDetail";
import { PriorityIncidents } from "@/components/PriorityIncidents";
import { LatencyPanel } from "@/components/LatencyPanel";
import { StatsCards } from "@/components/StatsCards";
import { EventMap } from "@/components/EventMap";
import {
  getAlertBreakdown,
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-8 pb-12 px-4 md:px-0">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-on-background mb-1">Global Event Dashboard</h2>
          <p className="text-sm text-on-surface-variant font-bold uppercase tracking-widest text-[11px]">Real-time threat monitoring and resource allocation.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">
          <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
          Live System Status: <span className="text-on-surface">Nominal</span>
        </div>
      </div>

      {/* 1. Global Event Summary (Stat Cards) */}
      <StatsCards
        summary={summary}
        alerts={alerts}
        eventsCount={events.length}
        loading={summaryLoading && alertsLoading}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto min-h-[600px]">
        
        {/* 2. Interactive Threat Map (8 Columns) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl ghost-border shadow-sm flex flex-col overflow-hidden relative">
          {/* Map Header Overlay */}
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
            <div className="glass-panel px-4 py-2 rounded-md pointer-events-auto shadow-sm">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-on-background flex items-center gap-2">
                <span className="text-lg">⊕</span> Global Threat Topography
              </h3>
            </div>
            <div className="glass-panel flex p-1 rounded-md pointer-events-auto shadow-sm">
              <button className="px-3 py-1 text-[10px] font-bold uppercase bg-white text-on-surface rounded shadow-sm">Live</button>
              <button className="px-3 py-1 text-[10px] font-bold uppercase text-on-surface-variant hover:text-on-surface">Forecast</button>
            </div>
          </div>

          <div className="flex-1 bg-surface-container-high relative min-h-[500px]">
             <EventMap
              events={events}
              selectedEventId={selectedEventId}
              impactZone={null}
              onEventSelect={handleEventSelect}
            />
          </div>

          {/* Map Legend */}
          <div className="h-12 border-t border-surface-container-high bg-surface-container-lowest flex items-center px-4 justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error"></span> Critical Severity</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tertiary"></span> High Risk</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-fixed-dim"></span> Assessor Deployed</div>
            </div>
            <div className="flex items-center gap-2">
              Overlay: Policyholder Density
            </div>
          </div>
        </div>

        {/* Right Column: Protocols & Feed (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 5. Command Protocols */}
          <div className="bg-surface-container-lowest rounded-xl ghost-border shadow-sm p-5">
            <h3 className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-4 border-b border-surface-container-high pb-2">Command Protocols</h3>
            <div className="space-y-3">
              <button 
                onClick={() => void run()}
                disabled={pipelineRunning}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-container transition-all ghost-border group text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary-container p-2 rounded text-on-primary-container group-hover:text-primary transition-colors">
                    <span>📡</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-on-surface">{buttonLabel}</div>
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Sync Theater Assets</div>
                  </div>
                </div>
                <span className="text-on-surface-variant opacity-40">→</span>
              </button>

              <Link 
                href="/readiness"
                className="w-full flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-container transition-all ghost-border group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-error-container p-2 rounded text-on-error-container">
                    <span>⚖️</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-error">System Readiness</div>
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Resource Allocation Model</div>
                  </div>
                </div>
                <span className="text-on-surface-variant opacity-40">→</span>
              </Link>
            </div>
          </div>

          {/* 3. Live Activity Feed */}
          <div className="bg-surface-container-lowest rounded-xl ghost-border shadow-sm flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <div className="p-4 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low">
              <h3 className="text-[10px] font-black text-on-surface uppercase tracking-widest">Live Activity</h3>
              <span className="text-[9px] font-bold text-on-surface-variant bg-surface px-2 py-0.5 rounded-full ghost-border uppercase tracking-widest">Auto-sync</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
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

      {/* 4. Active Priority Incidents (Data Table) */}
      <PriorityIncidents
        alerts={alerts}
        events={events}
        loading={eventsLoading}
        selectedEventId={selectedEventId}
        onEventSelect={handleEventSelect}
      />

      <LatencyPanel />

      {/* Floating Detail Overlay */}
      {selectedEventId && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center p-8 pointer-events-none">
          <div className="w-full max-w-5xl bg-surface shadow-atmospheric rounded-3xl border border-outline-variant pointer-events-auto animate-in slide-in-from-bottom duration-500 overflow-hidden border-b-0 rounded-b-none">
             <div className="max-h-[80vh] overflow-y-auto scrollbar-hide">
                <EventDetail
                  detail={detail}
                  loading={detailLoading}
                  onClose={handleCloseDetail}
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
