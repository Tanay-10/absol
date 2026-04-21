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
    map.flyTo([20, 0], 2, { duration: 0.75 });
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
    <div className="map-frame h-full w-full overflow-hidden rounded-[26px]">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        ref={setMap}
        zoomControl
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
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
      <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3">
        <div className="map-overlay-panel pointer-events-auto max-w-[240px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Legend
          </p>
          <div className="mt-3 grid gap-2 text-xs text-[var(--text-secondary)]">
            {[
              ["Minor / monitor", "var(--accent-cyan)"],
              ["Elevated watch", "var(--accent-amber)"],
              ["Severe / critical", "var(--accent-coral)"],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="map-overlay-stack pointer-events-auto">
          <button type="button" onClick={resetView} className="map-overlay-button">
            Global view
          </button>
          {variant === "impact" && selectedEventId ? (
            <button
              type="button"
              onClick={focusSelection}
              className="map-overlay-button"
            >
              Focus event
            </button>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4">
        <div className="map-overlay-panel max-w-[260px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Live tooltip layer
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            Hover or open a marker to inspect live alert posture and jump directly into
            the same event dossier.
          </p>
        </div>
      </div>
    </div>
  );
}
