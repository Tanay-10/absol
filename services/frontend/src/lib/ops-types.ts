import type { Alert, DashboardEvent } from "@/lib/types";

export type OpsHealthTone = "healthy" | "watch" | "critical";
export type ReadinessPosture = "ready" | "strained" | "critical";
export type RoutingChannel = "slack" | "queue" | "email";
export type PipelineUrgency = "monitor" | "route" | "escalate";

export interface OperationalZone {
  id: string;
  name: string;
  regionKeywords: string[];
  countryCodes: string[];
  eventFamilies: string[];
  staffingPoolIds: string[];
  routingDestinationIds: string[];
}

export interface StaffingPool {
  id: string;
  name: string;
  team: string;
  activeAgents: number;
  reserveAgents: number;
  concurrentCapacity: number;
  supportedEventFamilies: string[];
  zoneIds: string[];
}

export interface RoutingDestination {
  id: string;
  name: string;
  channel: RoutingChannel;
  target: string;
  enabled: boolean;
  priority: number;
  zoneIds: string[];
  eventFamilies: string[];
  alertLevels: Alert["alert_level"][];
}

export interface ThresholdSettings {
  readinessWarningScore: number;
  readinessCriticalScore: number;
  maxAlertLoadPerCoordinator: number;
  maxClaimsLoadPerAgent: number;
  staleSourceMinutes: number;
  quietSourceMinutes: number;
}

export interface SourceHealthRow {
  source: string;
  lastDetectedAt: string | null;
  minutesSinceLastEvent: number | null;
  eventCount: number;
  alertCount: number;
  affectedZoneIds: string[];
  tone: OpsHealthTone;
  statusLabel: string;
}

export interface ZoneReadinessRow {
  zoneId: string;
  zoneName: string;
  eventIds: string[];
  alertIds: string[];
  activeEvents: number;
  activeAlerts: number;
  estimatedClaims: number;
  staffedCapacity: number;
  reserveCapacity: number;
  routingDestinations: number;
  tone: OpsHealthTone;
}

export interface StaffingPoolView {
  id: string;
  name: string;
  team: string;
  activeAgents: number;
  reserveAgents: number;
  concurrentCapacity: number;
  allocatedLoad: number;
  utilization: number;
  supportedZones: string[];
  supportedEventFamilies: string[];
  tone: OpsHealthTone;
  recommendation: string;
}

export interface RoutingDestinationView {
  id: string;
  name: string;
  channel: RoutingChannel;
  target: string;
  enabled: boolean;
  priority: number;
  matchedEventIds: string[];
  matchedAlertIds: string[];
  zonesCovered: string[];
  eventFamilies: string[];
  tone: OpsHealthTone;
}

export interface PipelineEventRow {
  eventId: string;
  title: string;
  source: string;
  eventFamily: string;
  severityLabel: string;
  alertLevel: Alert["alert_level"] | "none";
  zoneIds: string[];
  matchedDestinationIds: string[];
  estimatedClaims: number;
  urgency: PipelineUrgency;
  occurredAt: string;
  detectedAt: string;
}

export interface ReadinessSnapshot {
  score: number;
  posture: ReadinessPosture;
  summary: string;
  activeEvents: number;
  activeAlerts: number;
  estimatedClaims: number;
  totalCapacity: number;
  reserveCapacity: number;
  staffingUtilization: number;
  impactedZones: number;
}

export interface ReadinessViewModel {
  snapshot: ReadinessSnapshot;
  zones: ZoneReadinessRow[];
  staffingPools: StaffingPoolView[];
  routingDestinations: RoutingDestinationView[];
  sourceHealth: SourceHealthRow[];
  activeEvents: DashboardEvent[];
  activeAlerts: Alert[];
  generatedAt: string;
}

export interface PipelineViewModel {
  sourceHealth: SourceHealthRow[];
  destinations: RoutingDestinationView[];
  eventQueue: PipelineEventRow[];
  pendingManualReview: number;
  readyDestinations: number;
  generatedAt: string;
}

export interface OpsConfig {
  zones: OperationalZone[];
  staffingPools: StaffingPool[];
  routingDestinations: RoutingDestination[];
  thresholds: ThresholdSettings;
}
