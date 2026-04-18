"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { EventMap } from "@/components/EventMap";
import { AlertFeed } from "@/components/AlertFeed";
import { EventDetail } from "@/components/EventDetail";
import { useDashboard } from "@/hooks/useDashboard";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { useEventDetail } from "@/hooks/useEventDetail";

export default function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header onPipelineComplete={handlePipelineComplete} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Map */}
        <div className="flex-1 p-4">
          <div className="h-full flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              {eventsLoading ? (
                <div className="w-full h-full bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <EventMap
                  events={events}
                  selectedEventId={selectedEventId}
                  impactZone={detail?.impact_zone || null}
                  onEventSelect={handleEventSelect}
                />
              )}
            </div>

            {/* Event Detail Panel */}
            {selectedEventId && (
              <EventDetail
                detail={detail}
                loading={detailLoading}
                onClose={handleCloseDetail}
              />
            )}
          </div>
        </div>

        {/* Right: Stats + Alerts */}
        <div className="w-96 border-l border-slate-700 p-4 flex flex-col gap-4 overflow-hidden">
          <StatsCards summary={summary} loading={summaryLoading} />

          <div className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Alert Feed
            </h2>
            <AlertFeed
              alerts={alerts}
              loading={alertsLoading}
              onAlertClick={handleEventSelect}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
