"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertFeed } from "@/components/AlertFeed";
import { EventDetail } from "@/components/EventDetail";
import { EventMap } from "@/components/EventMap";
import { EventRowList } from "@/components/EventRowList";
import { useAlerts } from "@/hooks/useAlerts";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useEvents } from "@/hooks/useEvents";
import { deriveImpactModel } from "@/lib/impactModel";
import { formatDateTime, formatPercent } from "@/lib/formatters";

interface ImpactScreenProps {
  initialEventId: string | null;
}

function getQueryHref(eventId: string) {
  return `/impact?eventId=${encodeURIComponent(eventId)}`;
}

export function ImpactScreen({ initialEventId }: ImpactScreenProps) {
  const router = useRouter();
  const { events, loading: eventsLoading } = useEvents();
  const { alerts, loading: alertsLoading } = useAlerts();
  const {
    detail,
    error: detailError,
    loading: detailLoading,
  } = useEventDetail(initialEventId);

  const impactModel = useMemo(
    () => (detail ? deriveImpactModel(detail) : null),
    [detail]
  );

  const selectedAlert =
    detail?.alert ?? alerts.find((alert) => alert.event_id === initialEventId) ?? null;

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      router.push(getQueryHref(eventId));
    },
    [router]
  );

  const prioritizedEvents = useMemo(() => {
    const alertWeight = new Map(
      alerts.map((alert) => [
        alert.event_id,
        alert.alert_level === "critical"
          ? 4
          : alert.alert_level === "high"
            ? 3
            : alert.alert_level === "medium"
              ? 2
              : 1,
      ])
    );

    return [...events]
      .sort((left, right) => {
        const alertDelta =
          (alertWeight.get(right.id) ?? 0) - (alertWeight.get(left.id) ?? 0);
        if (alertDelta !== 0) return alertDelta;
        return right.severity_score - left.severity_score;
      })
      .slice(0, 6);
  }, [alerts, events]);

  const tone = selectedAlert ? selectedAlert.alert_level : 'neutral';

  return (
    <div className="flex flex-col gap-10 py-4">
      {/* Header section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' || tone === 'high' ? 'badge-warning' : 'badge-stable'}`}>
              {selectedAlert ? `${selectedAlert.alert_level} alert` : "Awaiting event"}
            </span>
            <span className="label-sm opacity-40">Impact Analysis</span>
          </div>
          <h1 className="display-lg text-on-background">
            Live Portfolio Impact
          </h1>
          <p className="mt-6 text-xl text-on-surface-variant opacity-70 leading-relaxed">
            Move from signal detection into a dedicated impact workspace with live map focus, alert context, and modeled portfolio pressure.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/"
            className="rounded-xl bg-surface-high px-6 py-4 text-sm font-bold text-on-background transition-all hover:bg-surface-highest"
          >
            Dashboard
          </Link>
          {initialEventId && (
             <Link
                href={getQueryHref(initialEventId)}
                className="metallic-cta rounded-xl px-6 py-4 text-sm font-bold shadow-lg"
              >
                Refresh Focus
              </Link>
          )}
        </div>
      </section>

      {!initialEventId ? (
        <section className="surface-card p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <span className="label-sm text-on-surface-variant opacity-60">Event Queue</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Choose a live event</h2>
            </div>
            <span className="badge-warning rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              {alerts.length} Active Alerts
            </span>
          </div>
          <EventRowList
            events={prioritizedEvents}
            alerts={alerts}
            loading={eventsLoading}
            onEventSelect={handleSelectEvent}
            ctaLabel="Open live impact"
            emptyMessage="No live event is ready for impact analysis."
          />
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            {/* Map Column */}
            <div className="xl:col-span-8 space-y-10">
              <div className="surface-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="label-sm text-on-surface-variant opacity-60">Impact Theater</span>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Focused Catastrophe Map</h2>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' || tone === 'high' ? 'badge-warning' : 'badge-stable'}`}>
                    {selectedAlert ? `${selectedAlert.total_policies_affected} policies in play` : "Monitoring footprint"}
                  </div>
                </div>
                <div className="h-[600px] rounded-2xl overflow-hidden ghost-border relative">
                  <EventMap
                    events={events}
                    selectedEventId={initialEventId}
                    impactZone={detail?.impact_zone || null}
                    onEventSelect={handleSelectEvent}
                    variant="impact"
                  />
                </div>
              </div>

              {detailError ? (
                <div className="surface-card p-8 bg-error-container text-on-error-container font-bold">
                  {detailError}
                </div>
              ) : (
                <EventDetail detail={detail} loading={detailLoading} />
              )}
            </div>

            {/* Side Column */}
            <div className="xl:col-span-4 space-y-10">
              {/* Context Panel */}
              <div className="surface-card p-8">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <span className="label-sm text-on-surface-variant opacity-60">Alert Context</span>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-on-background">Response Posture</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' || tone === 'high' ? 'badge-warning' : 'badge-stable'}`}>
                    {selectedAlert?.recommended_action || "Awaiting Triage"}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="rounded-xl bg-surface-low p-6">
                    <p className="label-sm text-[10px] opacity-40 mb-4">Timeline</p>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant opacity-60">Detected</span>
                        <span className="font-bold">{detail?.event ? formatDateTime(detail.event.detected_at) : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant opacity-60">Occurred</span>
                        <span className="font-bold">{detail?.event ? formatDateTime(detail.event.occurred_at) : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface-low p-6">
                    <p className="label-sm text-[10px] opacity-40 mb-4">Severity Pressure</p>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-bold">{impactModel ? formatPercent(impactModel.severityPressure, 0) : "—"}</p>
                        <p className="mt-2 text-[10px] text-on-surface-variant opacity-50 leading-relaxed">Derived from live severity score and policy concentration</p>
                      </div>
                      <div className="h-20 w-3 rounded-full bg-surface-high overflow-hidden">
                        <div
                          className="w-full bg-primary"
                          style={{
                            height: `${Math.round((impactModel?.severityPressure ?? 0) * 100)}%`,
                            marginTop: 'auto'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface-low p-6">
                    <p className="label-sm text-[10px] opacity-40 mb-4">Concentration</p>
                    <p className="text-3xl font-bold">{impactModel ? formatPercent(impactModel.topPolicyMixShare, 0) : "—"}</p>
                    <p className="mt-2 text-[10px] text-on-surface-variant opacity-50">Top policy class share of affected exposures</p>
                  </div>
                </div>
              </div>

              {/* Event Switcher */}
              <div className="surface-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="label-sm text-on-surface-variant opacity-60">Switcher</span>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-on-background">Jump Focus</h2>
                  </div>
                  <span className="badge-stable rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Top 6</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto pr-2 -mr-2 scrollbar-hide">
                  <EventRowList
                    events={prioritizedEvents}
                    alerts={alerts}
                    loading={eventsLoading}
                    selectedEventId={initialEventId}
                    onEventSelect={handleSelectEvent}
                    ctaLabel="Load"
                  />
                </div>
              </div>

              {/* Alert Feed */}
              <div className="surface-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="label-sm text-on-surface-variant opacity-60">Direct Deep-Link</span>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-on-background">Active Alerts</h2>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2 scrollbar-hide">
                  <AlertFeed
                    alerts={alerts}
                    loading={alertsLoading}
                    onAlertClick={handleSelectEvent}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
