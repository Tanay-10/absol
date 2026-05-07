import type { Alert, DashboardEvent, DashboardSummary } from "@/lib/types";
import type {
  OpsConfig,
  OpsHealthTone,
  PipelineEventRow,
  PipelineViewModel,
  ReadinessPosture,
  ReadinessSnapshot,
  ReadinessViewModel,
  RoutingDestination,
  RoutingDestinationView,
  SourceHealthRow,
  StaffingPoolView,
  ZoneReadinessRow,
} from "@/lib/ops-types";

interface OpsInputs {
  summary: DashboardSummary | null;
  events: DashboardEvent[];
  alerts: Alert[];
  config: OpsConfig;
  now?: Date;
}

function toLower(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function minutesBetween(iso: string | null, now: Date) {
  if (!iso) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - value.getTime()) / 60_000));
}

function normalizeFamily(event: DashboardEvent) {
  const family = toLower(event.event_family);
  if (!family || family === "natural" || family === "other") {
    return toLower(event.event_type);
  }
  return family;
}

function matchesZone(
  zone: OpsConfig["zones"][number],
  event: DashboardEvent
) {
  const family = normalizeFamily(event);
  const region = toLower(event.region_name);
  const countryCodes = (event.country_codes ?? []).map((code) => code.toLowerCase());
  const familyMatch =
    zone.eventFamilies.length === 0 || zone.eventFamilies.includes(family);
  const regionMatch =
    zone.regionKeywords.length === 0 ||
    zone.regionKeywords.some((keyword) => region.includes(keyword));
  const countryMatch =
    zone.countryCodes.length === 0 ||
    zone.countryCodes.some((code) => countryCodes.includes(code.toLowerCase()));

  return familyMatch && regionMatch && countryMatch;
}

function alertWeight(level: Alert["alert_level"] | "none") {
  switch (level) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function toneFromSourceLag(
  minutesSinceLastEvent: number | null,
  thresholds: OpsConfig["thresholds"]
): OpsHealthTone {
  if (minutesSinceLastEvent === null) return "critical";
  if (minutesSinceLastEvent >= thresholds.staleSourceMinutes) return "critical";
  if (minutesSinceLastEvent >= thresholds.quietSourceMinutes) return "watch";
  return "healthy";
}

function toneFromRatio(
  value: number,
  warning = 0.8,
  critical = 1
): OpsHealthTone {
  if (value >= critical) return "critical";
  if (value >= warning) return "watch";
  return "healthy";
}

function zoneIdsForEvent(config: OpsConfig, event: DashboardEvent) {
  return config.zones.filter((zone) => matchesZone(zone, event)).map((zone) => zone.id);
}

function buildSourceHealthRows({
  events,
  alerts,
  config,
  now,
}: OpsInputs & { now: Date }): SourceHealthRow[] {
  const grouped = new Map<string, DashboardEvent[]>();

  events.forEach((event) => {
    const source = event.source || "unknown";
    const current = grouped.get(source) ?? [];
    current.push(event);
    grouped.set(source, current);
  });

  return Array.from(grouped.entries())
    .map(([source, sourceEvents]) => {
      const sortedEvents = [...sourceEvents].sort((left, right) => {
        const rightDate = right.detected_at ?? "";
        const leftDate = left.detected_at ?? "";
        return rightDate.localeCompare(leftDate);
      });
      const lastDetectedAt = sortedEvents[0]?.detected_at ?? null;
      const sourceEventIds = new Set(sourceEvents.map((event) => event.id));
      const minutesSinceLastEvent = minutesBetween(lastDetectedAt, now);
      const tone = toneFromSourceLag(minutesSinceLastEvent, config.thresholds);
      const affectedZoneIds = new Set<string>();

      sourceEvents.forEach((event) => {
        zoneIdsForEvent(config, event).forEach((zoneId) => affectedZoneIds.add(zoneId));
      });

      const alertCount = alerts.filter((alert) => sourceEventIds.has(alert.event_id)).length;
      const statusLabel =
        tone === "critical"
          ? "Source stale"
          : tone === "watch"
            ? "Source quiet"
            : "Flowing";

      return {
        source,
        lastDetectedAt,
        minutesSinceLastEvent,
        eventCount: sourceEvents.length,
        alertCount,
        affectedZoneIds: [...affectedZoneIds],
        tone,
        statusLabel,
      };
    })
    .sort((left, right) => {
      const toneRank = { critical: 0, watch: 1, healthy: 2 };
      return toneRank[left.tone] - toneRank[right.tone] || left.source.localeCompare(right.source);
    });
}

function buildZoneRows({
  events,
  alerts,
  config,
}: OpsInputs): ZoneReadinessRow[] {
  return config.zones.map((zone) => {
    const zoneEvents = events.filter((event) => matchesZone(zone, event));
    const zoneEventIds = new Set(zoneEvents.map((event) => event.id));
    const zoneAlerts = alerts.filter((alert) => zoneEventIds.has(alert.event_id));
    const staffedPools = config.staffingPools.filter((pool) => pool.zoneIds.includes(zone.id));
    const staffedCapacity = staffedPools.reduce(
      (total, pool) => total + pool.concurrentCapacity,
      0
    );
    const reserveCapacity = staffedPools.reduce(
      (total, pool) => total + pool.reserveAgents,
      0
    );
    const estimatedClaims = zoneAlerts.reduce(
      (total, alert) => total + alert.estimated_claim_count,
      0
    );
    const alertPressure =
      staffedCapacity === 0
        ? zoneAlerts.length > 0
          ? Number.POSITIVE_INFINITY
          : 0
        : zoneAlerts.length / staffedCapacity;
    const claimPressure =
      staffedCapacity === 0
        ? estimatedClaims > 0
          ? Number.POSITIVE_INFINITY
          : 0
        : estimatedClaims / staffedCapacity;
    const tone = toneFromRatio(Math.max(alertPressure * 4, claimPressure / 2));

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      eventIds: zoneEvents.map((event) => event.id),
      alertIds: zoneAlerts.map((alert) => alert.id),
      activeEvents: zoneEvents.length,
      activeAlerts: zoneAlerts.length,
      estimatedClaims,
      staffedCapacity,
      reserveCapacity,
      routingDestinations: zone.routingDestinationIds.length,
      tone,
    };
  }).sort((left, right) => right.activeAlerts - left.activeAlerts || right.activeEvents - left.activeEvents);
}

function buildStaffingRows({
  alerts,
  config,
  events,
}: OpsInputs): StaffingPoolView[] {
  const eventById = new Map(events.map((event) => [event.id, event]));

  return config.staffingPools
    .map((pool) => {
      const matchingAlerts = alerts.filter((alert) => {
        const event = eventById.get(alert.event_id);
        if (!event) return false;
        const family = normalizeFamily(event);
        return pool.supportedEventFamilies.length === 0 || pool.supportedEventFamilies.includes(family);
      });
      const allocatedLoad =
        matchingAlerts.reduce((total, alert) => total + alert.estimated_claim_count, 0) +
        matchingAlerts.length * config.thresholds.maxAlertLoadPerCoordinator;
      const utilization =
        pool.concurrentCapacity === 0 ? 0 : allocatedLoad / pool.concurrentCapacity;
      const tone = toneFromRatio(utilization);
      const recommendation =
        tone === "critical"
          ? "Pull reserve capacity now"
          : tone === "watch"
            ? "Stage backup coverage"
            : "Capacity within tolerance";

      return {
        id: pool.id,
        name: pool.name,
        team: pool.team,
        activeAgents: pool.activeAgents,
        reserveAgents: pool.reserveAgents,
        concurrentCapacity: pool.concurrentCapacity,
        allocatedLoad,
        utilization: Number(utilization.toFixed(2)),
        supportedZones: pool.zoneIds,
        supportedEventFamilies: pool.supportedEventFamilies,
        tone,
        recommendation,
      };
    })
    .sort((left, right) => right.utilization - left.utilization);
}

function matchesDestination(
  destination: RoutingDestination,
  eventFamily: string,
  zoneIds: string[],
  alertLevel: Alert["alert_level"] | "none"
) {
  const zoneMatch =
    destination.zoneIds.length === 0 ||
    destination.zoneIds.some((zoneId) => zoneIds.includes(zoneId));
  const familyMatch =
    destination.eventFamilies.length === 0 ||
    destination.eventFamilies.includes(eventFamily);
  const alertMatch =
    alertLevel === "none" ||
    destination.alertLevels.length === 0 ||
    destination.alertLevels.includes(alertLevel);

  return zoneMatch && familyMatch && alertMatch;
}

function buildDestinationRows({
  events,
  alerts,
  config,
}: OpsInputs): RoutingDestinationView[] {
  const alertByEventId = new Map(alerts.map((alert) => [alert.event_id, alert]));

  return config.routingDestinations
    .map((destination) => {
      const matchedEvents = events.filter((event) => {
        const zoneIds = zoneIdsForEvent(config, event);
        const alertLevel = alertByEventId.get(event.id)?.alert_level ?? "none";
        return matchesDestination(
          destination,
          normalizeFamily(event),
          zoneIds,
          alertLevel
        );
      });
      const matchedEventIds = matchedEvents.map((event) => event.id);
      const matchedEventIdSet = new Set(matchedEventIds);
      const matchedAlertIds = alerts
        .filter((alert) => matchedEventIdSet.has(alert.event_id))
        .map((alert) => alert.id);
      const totalWork = matchedEventIds.length + matchedAlertIds.length;
      const workPressure = destination.enabled && totalWork > 0
        ? totalWork / Math.max(1, config.thresholds.maxAlertLoadPerCoordinator)
        : 0;
      const tone: OpsHealthTone = !destination.enabled
        ? "critical"
        : toneFromRatio(workPressure);

      return {
        id: destination.id,
        name: destination.name,
        channel: destination.channel,
        target: destination.target,
        enabled: destination.enabled,
        priority: destination.priority,
        matchedEventIds,
        matchedAlertIds,
        zonesCovered: destination.zoneIds,
        eventFamilies: destination.eventFamilies,
        tone,
      };
    })
    .sort((left, right) => left.priority - right.priority || right.matchedAlertIds.length - left.matchedAlertIds.length);
}

function buildSnapshot({
  summary,
  alerts,
  config,
  zones,
  staffingPools,
  sourceHealth,
}: OpsInputs & {
  zones: ZoneReadinessRow[];
  staffingPools: StaffingPoolView[];
  sourceHealth: SourceHealthRow[];
}): ReadinessSnapshot {
  const totalCapacity = staffingPools.reduce(
    (total, pool) => total + pool.concurrentCapacity,
    0
  );
  const reserveCapacity = staffingPools.reduce(
    (total, pool) => total + pool.reserveAgents,
    0
  );
  const estimatedClaims =
    summary?.estimated_claims ??
    alerts.reduce((total, alert) => total + alert.estimated_claim_count, 0);
  const activeAlerts = summary?.active_alerts ?? alerts.length;
  const activeEvents = summary?.total_events ?? new Set(zones.flatMap((zone) => zone.eventIds)).size;
  const loadPressure =
    totalCapacity === 0
      ? activeAlerts > 0 || estimatedClaims > 0
        ? Number.POSITIVE_INFINITY
        : 0
      : Math.max(
          activeAlerts /
            Math.max(
              1,
              staffingPools.reduce((total, pool) => total + pool.activeAgents, 0) *
                config.thresholds.maxAlertLoadPerCoordinator
            ),
          estimatedClaims /
            Math.max(
              1,
              staffingPools.reduce((total, pool) => total + pool.activeAgents, 0) *
                config.thresholds.maxClaimsLoadPerAgent
            )
        );
  const sourcePenalty = sourceHealth.reduce((total, row) => {
    if (row.tone === "critical") return total + 14;
    if (row.tone === "watch") return total + 6;
    return total;
  }, 0);
  const normalizedSourcePenalty =
    sourceHealth.length === 0
      ? 0
      : Math.min(30, Math.round((sourcePenalty / sourceHealth.length) * 2));
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - loadPressure * 55 - normalizedSourcePenalty))
  );

  let posture: ReadinessPosture = "ready";
  if (score <= config.thresholds.readinessCriticalScore) {
    posture = "critical";
  } else if (score <= config.thresholds.readinessWarningScore) {
    posture = "strained";
  }

  const summaryText =
    posture === "critical"
      ? "Demand is outrunning configured staffing and needs immediate intervention."
      : posture === "strained"
        ? "Operational controls are holding, but surge buffers are narrowing."
        : "Configured staffing and routing can absorb the current watch window.";

  return {
    score,
    posture,
    summary: summaryText,
    activeEvents,
    activeAlerts,
    estimatedClaims,
    totalCapacity,
    reserveCapacity,
    staffingUtilization:
      totalCapacity === 0
        ? 0
        : Number(
            (
              staffingPools.reduce((total, pool) => total + pool.allocatedLoad, 0) /
              totalCapacity
            ).toFixed(2)
          ),
    impactedZones: zones.filter((zone) => zone.activeEvents > 0 || zone.activeAlerts > 0).length,
  };
}

function buildPipelineEventRows({
  events,
  alerts,
  config,
}: OpsInputs): PipelineEventRow[] {
  const alertByEventId = new Map(alerts.map((alert) => [alert.event_id, alert]));

  return events
    .map((event) => {
      const zoneIds = zoneIdsForEvent(config, event);
      const eventFamily = normalizeFamily(event);
      const alertLevel: Alert["alert_level"] | "none" =
        alertByEventId.get(event.id)?.alert_level ?? "none";
      const matchedDestinationIds = config.routingDestinations
        .filter((destination) =>
          matchesDestination(destination, eventFamily, zoneIds, alertLevel)
        )
        .map((destination) => destination.id);
      const estimatedClaims = alertByEventId.get(event.id)?.estimated_claim_count ?? 0;
      const urgencyWeight =
        alertWeight(alertLevel) + (matchedDestinationIds.length === 0 ? 1 : 0);
      const urgency: PipelineEventRow["urgency"] =
        urgencyWeight >= 4
          ? "escalate"
          : urgencyWeight >= 2
            ? "route"
            : "monitor";

      return {
        eventId: event.id,
        title: event.title,
        source: event.source,
        eventFamily,
        severityLabel: event.severity_label,
        alertLevel,
        zoneIds,
        matchedDestinationIds,
        estimatedClaims,
        urgency,
        occurredAt: event.occurred_at,
        detectedAt: event.detected_at,
      };
    })
    .sort((left, right) => {
      const urgencyRank = { escalate: 0, route: 1, monitor: 2 };
      return (
        urgencyRank[left.urgency] - urgencyRank[right.urgency] ||
        right.detectedAt.localeCompare(left.detectedAt)
      );
    });
}

export function createReadinessViewModel(inputs: OpsInputs): ReadinessViewModel {
  const now = inputs.now ?? new Date();
  const zones = buildZoneRows(inputs);
  const staffingPools = buildStaffingRows({ ...inputs, events: inputs.events });
  const sourceHealth = buildSourceHealthRows({ ...inputs, now });
  const routingDestinations = buildDestinationRows(inputs);
  const snapshot = buildSnapshot({
    ...inputs,
    zones,
    staffingPools,
    sourceHealth,
  });

  return {
    snapshot,
    zones,
    staffingPools,
    routingDestinations,
    sourceHealth,
    activeEvents: inputs.events,
    activeAlerts: inputs.alerts,
    generatedAt: now.toISOString(),
  };
}

export function createPipelineViewModel(inputs: OpsInputs): PipelineViewModel {
  const now = inputs.now ?? new Date();
  const sourceHealth = buildSourceHealthRows({ ...inputs, now });
  const destinations = buildDestinationRows(inputs);
  const eventQueue = buildPipelineEventRows(inputs);

  return {
    sourceHealth,
    destinations,
    eventQueue,
    pendingManualReview: eventQueue.filter((event) => event.matchedDestinationIds.length === 0).length,
    readyDestinations: destinations.filter((destination) => destination.enabled).length,
    generatedAt: now.toISOString(),
  };
}
