"use client";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Circle, Marker, Popup, Polyline, Rectangle, Tooltip } from "react-leaflet";
import type { DashboardEvent, ImpactZone, Waypoint } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#3b82f6",
  stable: "#3b82f6",
  moderate: "#eab308",
  major: "#f97316",
  warning: "#f97316",
  severe: "#ef4444",
  critical: "#ba1a1a",
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

function getIntensityColor(intensity: number) {
  if (intensity > 85) return SEVERITY_COLORS.critical;
  if (intensity > 70) return SEVERITY_COLORS.severe;
  if (intensity > 50) return SEVERITY_COLORS.major;
  if (intensity > 30) return SEVERITY_COLORS.moderate;
  return SEVERITY_COLORS.minor;
}

function createEventIcon(event: DashboardEvent, customColor?: string) {
  const color = customColor || SEVERITY_COLORS[event.severity_label] || "#3b82f6";
  const emoji = EVENT_ICONS[event.event_type] || "⚠️";

  return L.divIcon({
    html: `<div style="
      background:
        radial-gradient(circle at top, rgba(255,255,255,0.7), transparent 48%),
        linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)),
        #0b1c30;
      width: 42px;
      height: 42px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.1),
        0 12px 24px rgba(11,28,48,0.25);
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

function interpolate(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

/**
 * Animated Marker for mobile events (Hurricanes, Tornadoes, etc.)
 */
function AnimatedEventMarker({ event, isSelected, onClick }: MapMarkerProps) {
  const trajectory = event.trajectory!;
  const [currentPos, setCurrentPos] = useState<[number, number]>([
    trajectory.waypoints[trajectory.current_index].lat,
    trajectory.waypoints[trajectory.current_index].lon,
  ]);
  const [currentRadius, setCurrentRadius] = useState<number | null>(
    trajectory.waypoints[trajectory.current_index].state.radius_km || null
  );
  const [currentIntensity, setCurrentIntensity] = useState<number>(
    trajectory.waypoints[trajectory.current_index].state.intensity || 50
  );
  
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);
  
  // Animation duration for the WHOLE path in milliseconds
  const DURATION = 20000; 

  const animate = useCallback((time: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = time;
    }
    const elapsed = time - startTimeRef.current;
    const progress = (elapsed % DURATION) / DURATION;
    
    const totalWaypoints = trajectory.waypoints.length;
    const pathProgress = progress * (totalWaypoints - 1);
    const index = Math.floor(pathProgress);
    const factor = pathProgress - index;
    
    const w1 = trajectory.waypoints[index];
    const w2 = trajectory.waypoints[Math.min(index + 1, totalWaypoints - 1)];
    
    const lat = interpolate(w1.lat, w2.lat, factor);
    const lon = interpolate(w1.lon, w2.lon, factor);
    setCurrentPos([lat, lon]);
    
    if (w1.state.radius_km !== undefined && w2.state.radius_km !== undefined) {
      setCurrentRadius(interpolate(w1.state.radius_km, w2.state.radius_km, factor));
    }
    
    if (w1.state.intensity !== undefined && w2.state.intensity !== undefined) {
      setCurrentIntensity(interpolate(w1.state.intensity, w2.state.intensity, factor));
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, [trajectory, DURATION]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const color = getIntensityColor(currentIntensity);
  const historyPath = useMemo(() => 
    trajectory.waypoints.map(w => [w.lat, w.lon] as [number, number]),
    [trajectory]
  );

  return (
    <>
      <Marker
        position={currentPos}
        icon={createEventIcon(event, color)}
        eventHandlers={{ click: onClick }}
      >
        <Tooltip direction="top" opacity={1} className="map-tooltip" offset={[0, -16]}>
          <div>
            <p className="map-tooltip-title">{event.title} [Live Path]</p>
            <p className="map-tooltip-copy">
              Intensity: {Math.round(currentIntensity)}% · {currentRadius ? `${Math.round(currentRadius)}km radius` : 'Point threat'}
            </p>
          </div>
        </Tooltip>
        <Popup>
          <div className="map-popup">
            <p className="map-popup-eyebrow">Mobile Threat: {event.event_type}</p>
            <h4 className="map-popup-title">{event.title}</h4>
            <div className="map-popup-meta">
              <span>Path Tracking Active</span>
              <span>{Math.round(currentIntensity)}% Intensity</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)] italic">
              This event is being tracked in real-time. The visualization shows the interpolated trajectory and expanding impact zone.
            </p>
          </div>
        </Popup>
      </Marker>

      {/* Historical Path Line */}
      <Polyline 
        positions={historyPath}
        pathOptions={{ 
          color: '#0b1c30', 
          weight: 1, 
          dashArray: '4, 8', 
          opacity: 0.3 
        }} 
      />

      {/* Dynamic Impact Circle */}
      {currentRadius && (
        <Circle
          center={currentPos}
          radius={currentRadius * 1000}
          pathOptions={{ 
            color: color, 
            fillColor: color, 
            fillOpacity: 0.08, 
            weight: 1.5,
            dashArray: '5, 5'
          }}
        />
      )}
    </>
  );
}

/**
 * Static Marker for fixed events (Earthquakes, Industrial, etc.)
 */
function StaticEventMarker({ event, impactZone, isSelected, onClick }: MapMarkerProps) {
  const color = SEVERITY_COLORS[event.severity_label] || "#3b82f6";
  
  const radiusZone = impactZone?.zone_type === "radius" && impactZone.center_lat != null ? impactZone : null;
  const boundsZone = impactZone?.zone_type === "bbox" && impactZone.bbox ? impactZone : null;

  return (
    <>
      <Marker
        position={[event.latitude!, event.longitude!]}
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

export function MapEventMarker(props: MapMarkerProps) {
  if (props.event.latitude == null || props.event.longitude == null) return null;

  // Check if it's a mobile event with trajectory data
  const isMobile = props.event.is_mobile === true || props.event.is_mobile === 1;
  if (isMobile && props.event.trajectory?.waypoints?.length) {
    return <AnimatedEventMarker {...props} />;
  }

  return <StaticEventMarker {...props} />;
}
