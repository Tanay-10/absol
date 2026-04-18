# Frontend Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed ops dashboard (Next.js) that shows disaster events on a world map, displays real-time alerts, and lets users drill into affected policies and claim estimates.

**Architecture:** Next.js 14 App Router, single-page dashboard layout. Client-side data fetching from the FastAPI backend at `http://localhost:8001/api`. Leaflet map for event visualization. Supabase JS client for real-time alert subscriptions. Dark theme with Tailwind CSS.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS, Leaflet + react-leaflet, @supabase/supabase-js, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-18-full-app-design.md`

---

## File Structure

```
services/frontend/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local.example
├── .gitignore
├── public/
│   └── marker-icon.png (leaflet marker)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with dark theme, metadata
│   │   ├── page.tsx           # Dashboard page (assembles all components)
│   │   └── globals.css        # Tailwind imports + dark theme overrides
│   ├── components/
│   │   ├── Header.tsx         # App header with logo + run pipeline button
│   │   ├── StatsCards.tsx     # Summary stat cards (events, alerts, policies, $)
│   │   ├── EventMap.tsx       # Leaflet world map with event markers
│   │   ├── AlertFeed.tsx      # Real-time scrolling alert list
│   │   ├── EventDetail.tsx    # Modal/panel with event detail + affected policies
│   │   └── MapMarker.tsx      # Custom map marker component
│   ├── lib/
│   │   ├── api.ts             # Backend API client (fetch wrapper)
│   │   ├── supabase.ts        # Supabase JS client init
│   │   └── types.ts           # TypeScript interfaces for all data shapes
│   └── hooks/
│       ├── useDashboard.ts    # Hook for dashboard summary data
│       ├── useEvents.ts       # Hook for events list
│       ├── useAlerts.ts       # Hook for alerts + real-time subscription
│       └── useEventDetail.ts  # Hook for single event detail
```

---

### Task 1: Scaffold Next.js project with Tailwind dark theme

**Files:**
- Create: `services/frontend/package.json` (via create-next-app)
- Create: `services/frontend/.env.local.example`
- Modify: `services/frontend/tailwind.config.ts`
- Modify: `services/frontend/src/app/globals.css`
- Modify: `services/frontend/src/app/layout.tsx`

- [ ] **Step 1: Create Next.js project**

```bash
cd services && npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

When prompted, accept defaults.

- [ ] **Step 2: Create .env.local.example**

Create `services/frontend/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Update globals.css for dark theme**

Replace the contents of `services/frontend/src/app/globals.css`:
```css
@import "tailwindcss";

:root {
  --bg-primary: #0f172a;
  --bg-card: #1e293b;
  --bg-card-hover: #263548;
  --border: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
  --green: #22c55e;
  --yellow: #eab308;
  --orange: #f97316;
  --red: #ef4444;
  --purple: #a855f7;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
}

/* Leaflet overrides for dark theme */
.leaflet-container {
  background: #1a1a2e !important;
}
.leaflet-tile-pane {
  filter: brightness(0.7) contrast(1.1) saturate(0.8);
}
.leaflet-popup-content-wrapper {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px !important;
}
.leaflet-popup-tip {
  background: var(--bg-card) !important;
}
```

- [ ] **Step 4: Update layout.tsx**

Replace `services/frontend/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsureShield — Insurance Early Warning System",
  description: "Real-time disaster monitoring and insurance exposure analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f172a] text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
cd services/frontend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add services/frontend/
git commit -m "feat(frontend): scaffold Next.js app with dark theme"
```

---

### Task 2: Types and API client

**Files:**
- Create: `services/frontend/src/lib/types.ts`
- Create: `services/frontend/src/lib/api.ts`
- Create: `services/frontend/src/lib/supabase.ts`

- [ ] **Step 1: Create TypeScript interfaces**

Create `services/frontend/src/lib/types.ts`:
```typescript
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
```

- [ ] **Step 2: Create API client**

Create `services/frontend/src/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getDashboardSummary: () =>
    fetchAPI<import("./types").DashboardSummary>("/dashboard/summary"),

  getEvents: (params?: { event_type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.event_type) query.set("event_type", params.event_type);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchAPI<import("./types").DashboardEvent[]>(`/events${qs ? `?${qs}` : ""}`);
  },

  getEventDetail: (eventId: string) =>
    fetchAPI<import("./types").EventDetail>(`/events/${eventId}`),

  getAlerts: (params?: { level?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.level) query.set("level", params.level);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchAPI<import("./types").Alert[]>(`/alerts${qs ? `?${qs}` : ""}`);
  },

  runPipeline: () =>
    fetchAPI<import("./types").PipelineResult>("/pipeline/run", { method: "POST" }),
};
```

- [ ] **Step 3: Create Supabase client**

Create `services/frontend/src/lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Install Supabase client**

```bash
cd services/frontend && npm install @supabase/supabase-js
```

- [ ] **Step 5: Commit**

```bash
git add services/frontend/src/lib/
git commit -m "feat(frontend): add types, API client, and Supabase client"
```

---

### Task 3: Custom hooks for data fetching

**Files:**
- Create: `services/frontend/src/hooks/useDashboard.ts`
- Create: `services/frontend/src/hooks/useEvents.ts`
- Create: `services/frontend/src/hooks/useAlerts.ts`
- Create: `services/frontend/src/hooks/useEventDetail.ts`

- [ ] **Step 1: Create useDashboard hook**

Create `services/frontend/src/hooks/useDashboard.ts`:
```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export function useDashboard(refreshInterval = 30000) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, refreshInterval);
    return () => clearInterval(id);
  }, [refresh, refreshInterval]);

  return { summary, loading, refresh };
}
```

- [ ] **Step 2: Create useEvents hook**

Create `services/frontend/src/hooks/useEvents.ts`:
```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardEvent } from "@/lib/types";

export function useEvents() {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getEvents({ limit: 100 });
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, refresh };
}
```

- [ ] **Step 3: Create useAlerts hook with real-time**

Create `services/frontend/src/hooks/useAlerts.ts`:
```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Alert } from "@/lib/types";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getAlerts({ limit: 50 });
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Real-time subscription for new alerts
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { alerts, loading, refresh };
}
```

- [ ] **Step 4: Create useEventDetail hook**

Create `services/frontend/src/hooks/useEventDetail.ts`:
```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { EventDetail } from "@/lib/types";

export function useEventDetail(eventId: string | null) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!eventId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getEventDetail(eventId);
      setDetail(data);
    } catch (err) {
      console.error("Failed to fetch event detail:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { detail, loading, refresh };
}
```

- [ ] **Step 5: Commit**

```bash
git add services/frontend/src/hooks/
git commit -m "feat(frontend): add data fetching hooks with real-time alerts"
```

---

### Task 4: Header and Stats Cards components

**Files:**
- Create: `services/frontend/src/components/Header.tsx`
- Create: `services/frontend/src/components/StatsCards.tsx`

- [ ] **Step 1: Create Header component**

Create `services/frontend/src/components/Header.tsx`:
```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface HeaderProps {
  onPipelineComplete: () => void;
}

export function Header({ onPipelineComplete }: HeaderProps) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const runPipeline = async () => {
    setRunning(true);
    setStatus("Running pipeline...");
    try {
      const result = await api.runPipeline();
      setStatus(
        `✓ ${result.events_found} events found, ${result.events_processed} processed`
      );
      onPipelineComplete();
    } catch (err) {
      setStatus(`✗ Pipeline failed: ${err}`);
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(null), 8000);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          IS
        </div>
        <h1 className="text-xl font-bold text-slate-50">InsureShield</h1>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          Early Warning System
        </span>
      </div>
      <div className="flex items-center gap-4">
        {status && (
          <span className="text-sm text-slate-300 animate-pulse">{status}</span>
        )}
        <button
          onClick={runPipeline}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running...
            </>
          ) : (
            "▶ Run Pipeline"
          )}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create StatsCards component**

Create `services/frontend/src/components/StatsCards.tsx`:
```tsx
"use client";

import type { DashboardSummary } from "@/lib/types";

interface StatsCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

function StatCard({
  label,
  value,
  color = "text-slate-50",
  subtext,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${color}`}>{value}</span>
      {subtext && <span className="text-xs text-slate-500 mt-1">{subtext}</span>}
    </div>
  );
}

export function StatsCards({ summary, loading }: StatsCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard
        label="Active Events"
        value={summary.total_events}
        color="text-blue-400"
      />
      <StatCard
        label="Active Alerts"
        value={summary.active_alerts}
        color={summary.active_alerts > 0 ? "text-red-400" : "text-green-400"}
        subtext={`${summary.total_alerts} total`}
      />
      <StatCard
        label="Policies Exposed"
        value={summary.total_matches}
        color="text-orange-400"
        subtext={`of ${summary.total_policies} total`}
      />
      <StatCard
        label="Est. Claims"
        value={formatAmount(summary.estimated_total_amount)}
        color="text-yellow-400"
        subtext={`${summary.estimated_claims} claims`}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add services/frontend/src/components/Header.tsx services/frontend/src/components/StatsCards.tsx
git commit -m "feat(frontend): add Header and StatsCards components"
```

---

### Task 5: Event Map component (Leaflet)

**Files:**
- Create: `services/frontend/src/components/EventMap.tsx`
- Create: `services/frontend/src/components/MapMarker.tsx`

- [ ] **Step 1: Install Leaflet dependencies**

```bash
cd services/frontend && npm install leaflet react-leaflet && npm install -D @types/leaflet
```

- [ ] **Step 2: Create MapMarker component**

Create `services/frontend/src/components/MapMarker.tsx`:
```tsx
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
```

- [ ] **Step 3: Create EventMap component**

Create `services/frontend/src/components/EventMap.tsx`:
```tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { DashboardEvent, ImpactZone } from "@/lib/types";

// Dynamic import to avoid SSR issues with Leaflet
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
```

- [ ] **Step 4: Commit**

```bash
git add services/frontend/src/components/EventMap.tsx services/frontend/src/components/MapMarker.tsx
git commit -m "feat(frontend): add Leaflet event map with custom markers"
```

---

### Task 6: Alert Feed and Event Detail components

**Files:**
- Create: `services/frontend/src/components/AlertFeed.tsx`
- Create: `services/frontend/src/components/EventDetail.tsx`

- [ ] **Step 1: Create AlertFeed component**

Create `services/frontend/src/components/AlertFeed.tsx`:
```tsx
"use client";

import type { Alert } from "@/lib/types";

const LEVEL_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  critical: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
};

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
  onAlertClick: (eventId: string) => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function AlertFeed({ alerts, loading, onAlertClick }: AlertFeedProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-lg">No alerts yet</p>
        <p className="text-sm mt-1">Run the pipeline to generate alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-24rem)]">
      {alerts.map((alert) => {
        const style = LEVEL_STYLES[alert.alert_level] || LEVEL_STYLES.low;
        const event = alert.events;
        return (
          <button
            key={alert.id}
            onClick={() => onAlertClick(alert.event_id)}
            className={`w-full text-left p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors ${style.bg}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-semibold uppercase ${style.text}`}>
                  {alert.alert_level}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {formatTime(alert.generated_at)}
              </span>
            </div>
            <p className="text-sm font-medium mt-1 text-slate-200 line-clamp-1">
              {event?.title || `Event ${alert.event_id.slice(0, 8)}`}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{alert.total_policies_affected} policies</span>
              <span>{alert.estimated_claim_count} claims</span>
              <span className="font-medium text-slate-300">
                {formatAmount(alert.estimated_total_amount)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create EventDetail component**

Create `services/frontend/src/components/EventDetail.tsx`:
```tsx
"use client";

import type { EventDetail as EventDetailType } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "text-blue-400",
  moderate: "text-yellow-400",
  major: "text-orange-400",
  severe: "text-red-400",
  critical: "text-purple-400",
};

interface EventDetailProps {
  detail: EventDetailType | null;
  loading: boolean;
  onClose: () => void;
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function EventDetail({ detail, loading, onClose }: EventDetailProps) {
  if (!detail && !loading) return null;

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
        <div className="h-4 bg-slate-700 rounded w-1/3" />
      </div>
    );
  }

  if (!detail) return null;

  const { event, impact_zone, matches, estimates, alert } = detail;
  const sevColor = SEVERITY_COLORS[event.severity_label] || "text-slate-400";

  // Build policy table by joining matches with estimates
  const estimateMap = new Map(estimates.map((e) => [e.exposure_match_id, e]));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 overflow-y-auto max-h-[60vh]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-50">{event.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {event.event_type}
            </span>
            <span className={`text-xs font-semibold ${sevColor}`}>
              {event.severity_label} ({event.severity_score})
            </span>
            <span className="text-xs text-slate-500">
              {event.source}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-lg"
        >
          ✕
        </button>
      </div>

      {event.summary && (
        <p className="text-sm text-slate-400 mb-4">{event.summary}</p>
      )}

      {/* Impact zone info */}
      {impact_zone && (
        <div className="text-xs text-slate-500 mb-4">
          Impact: {impact_zone.zone_type}
          {impact_zone.radius_km && ` (${impact_zone.radius_km.toFixed(0)} km radius)`}
          {impact_zone.country_code && ` · ${impact_zone.country_code}`}
        </div>
      )}

      {/* Alert banner */}
      {alert && (
        <div className={`rounded-lg p-3 mb-4 ${
          alert.alert_level === "critical" ? "bg-red-500/10 border border-red-500/30" :
          alert.alert_level === "high" ? "bg-orange-500/10 border border-orange-500/30" :
          alert.alert_level === "medium" ? "bg-yellow-500/10 border border-yellow-500/30" :
          "bg-green-500/10 border border-green-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase">
              {alert.alert_level} alert
            </span>
            <span className="text-xs text-slate-400">{alert.recommended_action}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span>{alert.total_policies_affected} policies affected</span>
            <span>{alert.estimated_claim_count} est. claims</span>
            <span className="font-bold">{formatAmount(alert.estimated_total_amount)}</span>
          </div>
        </div>
      )}

      {/* Affected policies table */}
      {matches.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-2">
            Affected Policies ({matches.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-2 pr-3">Policy</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Holder</th>
                  <th className="text-right py-2 pr-3">Distance</th>
                  <th className="text-right py-2 pr-3">Probability</th>
                  <th className="text-right py-2">Est. Amount</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const est = estimateMap.get(match.id);
                  return (
                    <tr key={match.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 pr-3 text-slate-300">
                        {match.policies?.policy_number || match.policy_id.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-3 text-slate-400">
                        {match.policies?.policy_type || "—"}
                      </td>
                      <td className="py-2 pr-3 text-slate-400">
                        {match.policies?.policyholders?.name || "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-400">
                        {match.distance_km != null ? `${match.distance_km.toFixed(0)} km` : match.match_method}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-300">
                        {est ? `${(est.claim_probability * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-200">
                        {est ? formatAmount(est.estimated_amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No affected policies found.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add services/frontend/src/components/AlertFeed.tsx services/frontend/src/components/EventDetail.tsx
git commit -m "feat(frontend): add AlertFeed and EventDetail components"
```

---

### Task 7: Dashboard page — assemble everything

**Files:**
- Modify: `services/frontend/src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx with the dashboard**

Replace `services/frontend/src/app/page.tsx`:
```tsx
"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { EventMap } from "@/components/EventMap";
import { AlertFeed } from "@/components/AlertFeed";
import { EventDetail } from "@/components/EventDetail";
import { useDashboard } from "@/hooks/useDashboard";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { useEventDetail } from "@/hooks/useEventDetail";

export default function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useDashboard();
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { alerts, loading: alertsLoading, refresh: refreshAlerts } = useAlerts();
  const { detail, loading: detailLoading } = useEventDetail(selectedEventId);

  const handlePipelineComplete = useCallback(() => {
    refreshSummary();
    refreshEvents();
    refreshAlerts();
  }, [refreshSummary, refreshEvents, refreshAlerts]);

  const handleEventSelect = useCallback((eventId: string) => {
    setSelectedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header onPipelineComplete={handlePipelineComplete} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Map */}
        <div className="flex-1 p-4">
          <div className="h-full flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              {eventsLoading ? (
                <div className="w-full h-full bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <EventMap
                  events={events}
                  selectedEventId={selectedEventId}
                  impactZone={detail?.impact_zone || null}
                  onEventSelect={handleEventSelect}
                />
              )}
            </div>

            {/* Event Detail Panel */}
            {selectedEventId && (
              <EventDetail
                detail={detail}
                loading={detailLoading}
                onClose={handleCloseDetail}
              />
            )}
          </div>
        </div>

        {/* Right: Stats + Alerts */}
        <div className="w-96 border-l border-slate-700 p-4 flex flex-col gap-4 overflow-hidden">
          <StatsCards summary={summary} loading={summaryLoading} />

          <div className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Alert Feed
            </h2>
            <AlertFeed
              alerts={alerts}
              loading={alertsLoading}
              onAlertClick={handleEventSelect}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add Leaflet CSS import to layout**

Add to `services/frontend/src/app/layout.tsx`, inside `<head>` or via `next/head`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsureShield — Insurance Early Warning System",
  description: "Real-time disaster monitoring and insurance exposure analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-[#0f172a] text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
cd services/frontend && npm run build
```

Expected: successful build with no errors.

- [ ] **Step 4: Commit**

```bash
git add services/frontend/src/app/
git commit -m "feat(frontend): assemble dashboard page with map, stats, alerts, and event detail"
```

---

### Task 8: Final integration verification

- [ ] **Step 1: Run backend tests**

```bash
cd services/backend && python -m pytest tests/ -v
```

- [ ] **Step 2: Run frontend build**

```bash
cd services/frontend && npm run build
```

- [ ] **Step 3: Final commit**

```bash
cd /path/to/hackathon && git add .
git commit -m "feat: complete InsureShield full-stack application

Backend:
- FastAPI with geo-matching, claim estimation, alert generation
- Supabase PostgREST client for all database operations
- Pipeline orchestration endpoint

Frontend:
- Next.js dark-themed ops dashboard
- Leaflet world map with severity-coded event markers
- Real-time alert feed with Supabase subscriptions
- Event detail view with affected policies table
- Stats cards with aggregate metrics"
```
