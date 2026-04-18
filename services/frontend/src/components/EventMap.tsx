"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
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
}

export function EventMap({
  events,
  selectedEventId,
  impactZone,
  onEventSelect,
}: EventMapProps) {
  const mappableEvents = useMemo(
    () => events.filter((e) => e.latitude != null && e.longitude != null),
    [events]
  );

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="w-full h-full"
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
    </div>
  );
}
