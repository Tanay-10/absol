import type { Alert, DashboardEvent, DashboardSummary } from "@/lib/types";

export type DashboardTone = "neutral" | "low" | "medium" | "high" | "critical";

export const ALERT_PRIORITY: Record<Alert["alert_level"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const EVENT_PRIORITY: Record<string, number> = {
  minor: 1,
  moderate: 2,
  major: 3,
  severe: 4,
  critical: 5,
};

export function formatCompactAmount(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatAbsoluteTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(iso: string) {
  const value = Date.parse(iso);
  if (Number.isNaN(value)) return "moments ago";

  const diffMs = Date.now() - value;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getAlertTone(level?: Alert["alert_level"] | null): DashboardTone {
  if (level === "critical") return "critical";
  if (level === "medium" || level === "high") return "medium";
  return "neutral";
}

export function getEventTone(label?: string | null): DashboardTone {
  if (label === "critical" || label === "severe") return "critical";
  if (label === "moderate" || label === "major") return "medium";
  return "neutral";
}

export function getRegionLabel(
  event?: Pick<DashboardEvent, "region_name" | "country_codes"> | null
) {
  if (!event) return "Region pending";
  if (event.region_name) return event.region_name;
  if (event.country_codes?.length) return event.country_codes.join(", ");
  return "Region pending";
}

export function getLatestDashboardTimestamp(
  alerts: Alert[],
  events: DashboardEvent[]
) {
  const timestamps = [
    ...alerts.map((alert) => Date.parse(alert.generated_at)),
    ...events.map((event) => Date.parse(event.detected_at)),
  ].filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

export function getAlertBreakdown(
  summary: DashboardSummary | null,
  alerts: Alert[]
): DashboardSummary["alert_breakdown"] {
  if (summary) return summary.alert_breakdown;

  return alerts.reduce(
    (acc, alert) => {
      acc[alert.alert_level] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );
}

export function compareIncidents(
  leftEvent: DashboardEvent,
  rightEvent: DashboardEvent,
  alertsByEventId: Map<string, Alert>
) {
  const leftAlert = alertsByEventId.get(leftEvent.id);
  const rightAlert = alertsByEventId.get(rightEvent.id);

  const alertPriority =
    (rightAlert ? ALERT_PRIORITY[rightAlert.alert_level] : 0) -
    (leftAlert ? ALERT_PRIORITY[leftAlert.alert_level] : 0);

  if (alertPriority !== 0) return alertPriority;

  const eventPriority =
    (EVENT_PRIORITY[rightEvent.severity_label] || 0) -
    (EVENT_PRIORITY[leftEvent.severity_label] || 0);

  if (eventPriority !== 0) return eventPriority;

  if (rightEvent.severity_score !== leftEvent.severity_score) {
    return rightEvent.severity_score - leftEvent.severity_score;
  }

  return (
    Date.parse(rightEvent.detected_at || rightEvent.occurred_at) -
    Date.parse(leftEvent.detected_at || leftEvent.occurred_at)
  );
}
