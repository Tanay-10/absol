"use client";

import { PageHeader } from "@/components/PageHeader";
import { EventRowList } from "@/components/EventRowList";
import { EventDetail } from "@/components/EventDetail";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function EventsPage() {
  const { events, loading: eventsLoading } = useEvents();
  const { alerts, loading: alertsLoading } = useAlerts();
  const searchParams = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get("event")
  );
  const { detail, loading: detailLoading } = useEventDetail(selectedEventId);

  return (
    <div className="flex flex-col gap-8 py-4">
      <PageHeader
        title="Full Event Register"
        subtitle={`${events.length} active events tracked across all sources`}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: full event list */}
        <div className="surface-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-6">
            All Events
          </h2>
          <EventRowList
            events={events}
            alerts={alerts}
            loading={eventsLoading || alertsLoading}
            selectedEventId={selectedEventId}
            onEventSelect={setSelectedEventId}
            ctaLabel="Deep Dive"
            emptyMessage="No events detected yet. Run the pipeline to fetch live data."
          />
        </div>

        {/* Right: event detail panel */}
        <div>
          {selectedEventId ? (
            <EventDetail
              detail={detail}
              loading={detailLoading}
              onClose={() => setSelectedEventId(null)}
            />
          ) : (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-2 border-dashed border-surface-high text-center text-on-surface-variant opacity-40 p-8">
              <div>
                <div className="text-4xl mb-4">◬</div>
                <p className="font-bold uppercase tracking-widest text-[11px]">
                  Select an event to view its impact dossier
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}