"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertFeed } from "@/components/AlertFeed";
import { EventDetail } from "@/components/EventDetail";
import { EventMap } from "@/components/EventMap";
import { EventRowList } from "@/components/EventRowList";
import { PageHeader } from "@/components/PageHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Impact analysis"
        title="Live portfolio impact"
        description="Move from signal detection into a dedicated impact workspace with live map focus, alert context, and modeled portfolio pressure."
        meta={
          <>
            <SeverityBadge tone={selectedAlert?.alert_level || "neutral"}>
              {selectedAlert ? `${selectedAlert.alert_level} alert` : "Awaiting event"}
            </SeverityBadge>
            <SeverityBadge tone="medium">
              {initialEventId ? "Deep-link active" : "Select an event"}
            </SeverityBadge>
          </>
        }
        actions={
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/"
              className="ghost-border rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-ghost-strong)] hover:text-[var(--text-primary)]"
            >
              Back to dashboard
            </Link>
            {initialEventId ? (
              <Link
                href={getQueryHref(initialEventId)}
                className="metallic-cta rounded-full px-4 py-2 text-sm font-semibold"
              >
                Refresh focus
              </Link>
            ) : null}
          </div>
        }
      />

      {!initialEventId ? (
        <SurfaceCard tone="muted" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                Event queue
              </p>
              <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                Choose a live event
              </h2>
            </div>
            <SeverityBadge tone={alerts.length > 0 ? "high" : "neutral"}>
              {alerts.length > 0 ? `${alerts.length} active alerts` : "Standby"}
            </SeverityBadge>
          </div>
          <EventRowList
            events={prioritizedEvents}
            alerts={alerts}
            loading={eventsLoading}
            onEventSelect={handleSelectEvent}
            ctaLabel="Open live impact"
            emptyMessage="No live event is ready for impact analysis."
          />
        </SurfaceCard>
      ) : (
        <>
          <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
            <SurfaceCard tone="glass" className="flex min-h-[480px] flex-col p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Impact theater
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                    Focused catastrophe map
                  </h2>
                </div>
                <SeverityBadge tone={selectedAlert?.alert_level || "neutral"}>
                  {selectedAlert
                    ? `${selectedAlert.total_policies_affected} policies in play`
                    : "Monitoring footprint"}
                </SeverityBadge>
              </div>
              <div className="min-h-0 flex-1">
                <EventMap
                  events={events}
                  selectedEventId={initialEventId}
                  impactZone={detail?.impact_zone || null}
                  onEventSelect={handleSelectEvent}
                  variant="impact"
                />
              </div>
            </SurfaceCard>

            <div className="flex min-h-0 flex-col gap-6">
              <SurfaceCard tone="raised" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Alert context
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                      Response posture
                    </h2>
                  </div>
                  <SeverityBadge tone={selectedAlert?.alert_level || "neutral"}>
                    {selectedAlert?.recommended_action || "Awaiting triage"}
                  </SeverityBadge>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-[22px] bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Timeline
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Detected</span>
                        <span className="text-[var(--text-primary)]">
                          {detail?.event ? formatDateTime(detail.event.detected_at) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Occurred</span>
                        <span className="text-[var(--text-primary)]">
                          {detail?.event ? formatDateTime(detail.event.occurred_at) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Severity pressure
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold text-[var(--text-primary)]">
                          {impactModel ? formatPercent(impactModel.severityPressure, 0) : "—"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Derived from live severity score and policy concentration
                        </p>
                      </div>
                      <div className="h-16 w-3 rounded-full bg-white/8">
                        <div
                          className="ml-auto mt-auto w-full rounded-full bg-[linear-gradient(180deg,var(--accent-cyan),var(--accent-violet))]"
                          style={{
                            height: `${Math.round(
                              (impactModel?.severityPressure ?? 0) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Concentration
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                      {impactModel
                        ? formatPercent(impactModel.topPolicyMixShare, 0)
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Top policy class share of affected exposures
                    </p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard tone="muted" className="min-h-0 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Live event switcher
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                      Jump between impacted events
                    </h2>
                  </div>
                  <SeverityBadge tone="medium">Top six</SeverityBadge>
                </div>
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  <EventRowList
                    events={prioritizedEvents}
                    alerts={alerts}
                    loading={eventsLoading}
                    selectedEventId={initialEventId}
                    onEventSelect={handleSelectEvent}
                    ctaLabel="Load focus"
                  />
                </div>
              </SurfaceCard>
            </div>
          </div>

          {detailError ? (
            <SurfaceCard tone="raised" className="p-6">
              <p className="text-sm text-[var(--accent-coral)]">
                {detailError}
              </p>
            </SurfaceCard>
          ) : (
            <EventDetail detail={detail} loading={detailLoading} />
          )}

          <SurfaceCard tone="muted" className="flex min-h-[360px] flex-col p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Alert stream
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  Deep-link from active alerts
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
                onAlertClick={handleSelectEvent}
              />
            </div>
          </SurfaceCard>
        </>
      )}
    </div>
  );
}
