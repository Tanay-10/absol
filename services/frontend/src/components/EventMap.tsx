"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardEvent, ImpactZone } from "@/lib/types";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const MapEventMarkerDynamic = dynamic(
  () => import("./MapMarker").then((m) => m.MapEventMarker),
  { ssr: false }
);

interface EventMapProps {
  events: DashboardEvent[];
  selectedEventId: string | null;
  impactZone: ImpactZone | null;
  onEventSelect: (eventId: string) => void;
  variant?: "dashboard" | "impact";
}

// World bounds to prevent infinite horizontal scrolling
const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-85, -180],
  [85, 180],
];

function fitToSelection(
  map: import("leaflet").Map,
  event: DashboardEvent | undefined,
  impactZone: ImpactZone | null
) {
  if (
    impactZone?.zone_type === "bbox" &&
    impactZone.bbox &&
    impactZone.bbox.length === 4
  ) {
    map.fitBounds(
      [
        [impactZone.bbox[0], impactZone.bbox[1]],
        [impactZone.bbox[2], impactZone.bbox[3]],
      ],
      { padding: [40, 40] }
    );
    return;
  }

  if (
    impactZone?.zone_type === "radius" &&
    impactZone.center_lat != null &&
    impactZone.center_lon != null &&
    impactZone.radius_km
  ) {
    const latDelta = impactZone.radius_km / 111;
    const lonDelta =
      impactZone.radius_km /
      (111 * Math.max(Math.cos((impactZone.center_lat * Math.PI) / 180), 0.2));
    map.fitBounds(
      [
        [impactZone.center_lat - latDelta, impactZone.center_lon - lonDelta],
        [impactZone.center_lat + latDelta, impactZone.center_lon + lonDelta],
      ],
      { padding: [40, 40] }
    );
    return;
  }

  if (event?.latitude != null && event.longitude != null) {
    map.flyTo([event.latitude, event.longitude], 5, { duration: 0.75 });
    return;
  }

  map.setView([20, 0], 2);
}

export function EventMap({
  events,
  selectedEventId,
  impactZone,
  onEventSelect,
  variant = "dashboard",
}: EventMapProps) {
  const mappableEvents = useMemo(
    () => events.filter((e) => e.latitude != null && e.longitude != null),
    [events]
  );
  const [map, setMap] = useState<import("leaflet").Map | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  const resetView = useCallback(() => {
    if (!map) return;
    map.flyTo([20, 0], 2.5, { duration: 0.75 });
  }, [map]);

  const focusSelection = useCallback(() => {
    if (!map) return;
    fitToSelection(map, selectedEvent, impactZone);
  }, [impactZone, map, selectedEvent]);

  useEffect(() => {
    if (!map || variant !== "impact" || !selectedEventId) return;
    fitToSelection(map, selectedEvent, impactZone);
  }, [impactZone, map, selectedEvent, selectedEventId, variant]);

  return (
    <div className="map-frame h-full w-full overflow-hidden rounded-[26px] bg-surface-low">
      <MapContainer
        center={[20, 0]}
        zoom={2.5}
        minZoom={2.5}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1.0}
        ref={setMap}
        zoomControl
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          noWrap={true}
          bounds={WORLD_BOUNDS}
        />
        {mappableEvents.map((event) => (
          <MapEventMarkerDynamic
            key={event.id}
            event={event}
            impactZone={selectedEventId === event.id ? impactZone : null}
            isSelected={selectedEventId === event.id}
            onClick={() => onEventSelect(event.id)}
          />
        ))}
      </MapContainer>
      
      {/* Legend & Controls - Redesigned for light theme */}
      <div className="pointer-events-none absolute inset-x-6 top-6 flex items-start justify-between gap-4 z-[1000]">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-atmospheric pointer-events-auto border border-on-surface-variant/5">
          <p className="label-sm text-[10px] opacity-40 mb-3">Threat Severity</p>
          <div className="grid gap-2.5">
            {[
              ["Minor / Monitor", "badge-stable"],
              ["Elevated Watch", "badge-warning"],
              ["Severe / Critical", "badge-critical"],
            ].map(([label, badgeClass]) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${badgeClass === 'badge-stable' ? 'bg-stable' : badgeClass === 'badge-warning' ? 'bg-warning' : 'bg-error'}`} />
                <span className="text-[11px] font-bold text-on-background opacity-80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <button 
            type="button" 
            onClick={resetView} 
            className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-atmospheric border border-on-surface-variant/5 text-[10px] font-bold uppercase tracking-widest text-on-background hover:bg-white transition-all"
          >
            Global view
          </button>
          {variant === "impact" && selectedEventId && (
            <button
              type="button"
              onClick={focusSelection}
              className="metallic-cta px-4 py-2 rounded-xl shadow-lg text-[10px] font-bold uppercase tracking-widest"
            >
              Focus event
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-6 z-[1000]">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-atmospheric border border-on-surface-variant/5 max-w-[240px]">
          <p className="label-sm text-[10px] opacity-40 mb-2">Live Tooltip Layer</p>
          <p className="text-[11px] leading-relaxed text-on-surface-variant opacity-70 italic">
            Markers dynamically scale based on modeled exposure density and real-time alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
