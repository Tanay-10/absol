"use client";

import L from "leaflet";
import { Circle, Marker, Popup, Rectangle, Tooltip } from "react-leaflet";
import type { DashboardEvent, ImpactZone } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#3b82f6",
  moderate: "#eab308",
  major: "#f97316",
  severe: "#ef4444",
  critical: "#a855f7",
};

const EVENT_ICONS: Record<string, string> = {
  earthquake: "🌍",
  flood: "🌊",
  wildfire: "🔥",
  tsunami: "🌊",
  cyclone: "🌀",
  storm: "⛈️",
  tornado: "🌪️",
  volcano: "🌋",
  conflict: "⚔️",
  terrorism: "💣",
  industrial: "🏭",
};

interface MapMarkerProps {
  event: DashboardEvent;
  impactZone?: ImpactZone | null;
  isSelected: boolean;
  onClick: () => void;
}

function createEventIcon(event: DashboardEvent) {
  const color = SEVERITY_COLORS[event.severity_label] || "#3b82f6";
  const emoji = EVENT_ICONS[event.event_type] || "⚠️";

  return L.divIcon({
    html: `<div style="
      background:
        radial-gradient(circle at top, rgba(255,255,255,0.55), transparent 48%),
        linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05)),
        rgba(7,11,20,0.92);
      width: 42px;
      height: 42px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 1px solid rgba(255,255,255,0.22);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        0 0 0 1px ${color}30,
        0 18px 34px rgba(6,10,18,0.38);
      position: relative;
      overflow: hidden;
    "><span style="
      position:absolute;
      bottom:6px;
      right:6px;
      width:8px;
      height:8px;
      border-radius:999px;
      background:${color};
      box-shadow:0 0 10px ${color};
    "></span>${emoji}</div>`,
    className: "custom-marker-shell",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
    tooltipAnchor: [0, -24],
  });
}

function formatSeverity(event: DashboardEvent) {
  return `Severity ${event.severity_label} · ${event.severity_score}`;
}

function hasRadiusZone(impactZone?: ImpactZone | null) {
  return (
    impactZone?.zone_type === "radius" &&
    impactZone.center_lat != null &&
    impactZone.center_lon != null &&
    Boolean(impactZone.radius_km)
  );
}

function hasBoundsZone(impactZone?: ImpactZone | null) {
  return impactZone?.zone_type === "bbox" && Boolean(impactZone.bbox);
}

export function MapEventMarker({
  event,
  impactZone,
  isSelected,
  onClick,
}: MapMarkerProps) {
  if (event.latitude == null || event.longitude == null) return null;

  const color = SEVERITY_COLORS[event.severity_label] || "#3b82f6";
  const radiusZone = hasRadiusZone(impactZone) ? impactZone : null;
  const boundsZone = hasBoundsZone(impactZone) ? impactZone : null;

  return (
    <>
      <Marker
        position={[event.latitude, event.longitude]}
        icon={createEventIcon(event)}
        eventHandlers={{ click: onClick }}
      >
        <Tooltip direction="top" opacity={1} className="map-tooltip" offset={[0, -16]}>
          <div>
            <p className="map-tooltip-title">{event.title}</p>
            <p className="map-tooltip-copy">
              {event.region_name || event.source} · {formatSeverity(event)}
            </p>
          </div>
        </Tooltip>
        <Popup>
          <div className="map-popup">
            <p className="map-popup-eyebrow">{event.event_type}</p>
            <h4 className="map-popup-title">{event.title}</h4>
            <div className="map-popup-meta">
              <span>{event.region_name || event.source}</span>
              <span>{formatSeverity(event)}</span>
            </div>
            {event.summary ? (
              <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
                {event.summary}
              </p>
            ) : null}
          </div>
        </Popup>
      </Marker>

      {isSelected && radiusZone ? (
        <Circle
          center={[radiusZone.center_lat!, radiusZone.center_lon!]}
          radius={radiusZone.radius_km! * 1000}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.13, weight: 2 }}
        />
      ) : null}

      {isSelected && boundsZone ? (
        <Rectangle
          bounds={[
            [boundsZone.bbox![0], boundsZone.bbox![1]],
            [boundsZone.bbox![2], boundsZone.bbox![3]],
          ]}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.13, weight: 2 }}
        />
      ) : null}
    </>
  );
}
