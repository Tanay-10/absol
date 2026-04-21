"use client";

import { useCallback } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { useDashboard } from "@/hooks/useDashboard";
import { useEvents } from "@/hooks/useEvents";

export function useOperationalFeeds() {
  const dashboard = useDashboard();
  const events = useEvents();
  const alerts = useAlerts();
  const refreshDashboard = dashboard.refresh;
  const refreshEvents = events.refresh;
  const refreshAlerts = alerts.refresh;

  const refreshAll = useCallback(
    () => Promise.allSettled([refreshDashboard(), refreshEvents(), refreshAlerts()]),
    [refreshAlerts, refreshDashboard, refreshEvents]
  );

  return {
    summary: dashboard.summary,
    events: events.events,
    alerts: alerts.alerts,
    loading:
      dashboard.loading ||
      events.loading ||
      alerts.loading,
    refreshAll,
  };
}
