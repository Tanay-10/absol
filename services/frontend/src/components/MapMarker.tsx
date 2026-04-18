"use client";

import L from "leaflet";
import { Marker, Popup, Circle, Rectangle } from "react-leaflet";
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

function createEventIcon(event: DashboardEvent) {
  const color = SEVERITY_COLORS[event.severity_label] || "#3b82f6";
  const emoji = EVENT_ICONS[event.event_type] || "⚠️";

  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      box-shadow: 0 0 12px ${color}80;
    ">${emoji}</div>`,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface MapMarkerProps {
  event: DashboardEvent;
  impactZone?: ImpactZone | null;
  isSelected: boolean;
  onClick: () => void;
}

export function MapEventMarker({
  event,
  impactZone,
  isSelected,
  onClick,
}: MapMarkerProps) {
  if (!event.latitude || !event.longitude) return null;

  const color = SEVERITY_COLORS[event.severity_label] || "#3b82f6";

  return (
    <>
      <Marker
        position={[event.latitude, event.longitude]}
        icon={createEventIcon(event)}
        eventHandlers={{ click: onClick }}
      >
        <Popup>
          <div className="text-sm">
            <strong>{event.title}</strong>
            <br />
            <span>Type: {event.event_type}</span>
            <br />
            <span>Severity: {event.severity_label} ({event.severity_score})</span>
          </div>
        </Popup>
      </Marker>

      {isSelected && impactZone?.zone_type === "radius" && impactZone.center_lat && impactZone.center_lon && impactZone.radius_km && (
        <Circle
          center={[impactZone.center_lat, impactZone.center_lon]}
          radius={impactZone.radius_km * 1000}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }}
        />
      )}

      {isSelected && impactZone?.zone_type === "bbox" && impactZone.bbox && (
        <Rectangle
          bounds={[
            [impactZone.bbox[0], impactZone.bbox[1]],
            [impactZone.bbox[2], impactZone.bbox[3]],
          ]}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }}
        />
      )}
    </>
  );
}
