export interface WaypointState {
  intensity?: number;
  speed_kph?: number;
  direction_deg?: number;
  category?: number;
  radius_km?: number;
  [key: string]: any;
}

export interface Waypoint {
  t: string;
  lat: number;
  lon: number;
  state: WaypointState;
}

export interface TrajectoryData {
  waypoints: Waypoint[];
  interval_minutes: number;
  current_index: number;
  total_waypoints: number;
}

export interface DashboardEvent {
  id: string;
  canonical_id: string;
  source: string;
  event_type: string;
  event_family: string;
  title: string;
  summary: string | null;
  severity_label: string;
  severity_score: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
  bbox: number[] | null;
  region_name: string | null;
  country_codes: string[] | null;
  occurred_at: string;
  detected_at: string;
  first_seen_at: string;
  is_mobile?: boolean | number; // SQLite might return 0/1
  trajectory?: TrajectoryData;
}

export interface ImpactZone {
  id: string;
  event_id: string;
  zone_type: string;
  center_lat: number | null;
  center_lon: number | null;
  radius_km: number | null;
  bbox: number[] | null;
  admin_region: string | null;
  country_code: string | null;
}

export interface Alert {
  id: string;
  event_id: string;
  alert_level: "low" | "medium" | "high" | "critical";
  total_policies_affected: number;
  estimated_claim_count: number;
  estimated_total_amount: number;
  recommended_action: string;
  generated_at: string;
  events?: DashboardEvent;
}

export interface ExposureMatch {
  id: string;
  event_id: string;
  policy_id: string;
  location_id: string;
  distance_km: number | null;
  match_method: string;
  policies?: Policy;
  insured_locations?: InsuredLocation;
}

export interface Policy {
  id: string;
  policyholder_id: string;
  policy_number: string;
  policy_type: string;
  coverage_amount: number;
  policyholders?: Policyholder;
}

export interface Policyholder {
  id: string;
  name: string;
  type: string;
}

export interface InsuredLocation {
  id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  country_code: string;
}

export interface ClaimEstimate {
  id: string;
  exposure_match_id: string;
  claim_probability: number;
  estimated_amount: number;
  risk_factors: Record<string, unknown>;
}

export interface DashboardSummary {
  total_events: number;
  total_alerts: number;
  active_alerts: number;
  total_policies: number;
  total_matches: number;
  estimated_claims: number;
  estimated_total_amount: number;
  alert_breakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface EventDetail {
  event: DashboardEvent;
  impact_zone: ImpactZone | null;
  matches: ExposureMatch[];
  estimates: ClaimEstimate[];
  alert: Alert | null;
}

export interface PipelineResult {
  extraction_output: string;
  events_found: number;
  events_processed: number;
  results: Array<{
    event_id: string;
    status: string;
    matches?: number;
    alert_level?: string;
  }>;
}

export interface LatencyEvent {
  event_id: string;
  title: string;
  event_type: string;
  severity_label: string;
  first_seen_at: string;
  detected_at: string;
  occurred_at: string | null;
  alert_generated_at: string;
  alert_level: "low" | "medium" | "high" | "critical";
  estimated_claim_count: number;
  latency_minutes: number;
}
 
export interface LatencySummary {
  avg_latency_minutes: number | null;
  min_latency_minutes: number | null;
  max_latency_minutes: number | null;
  within_2h_pct: number | null;
  total_events: number;
}
 
export interface LatencyStats {
  events: LatencyEvent[];
  summary: LatencySummary;
}