import { useEffect, useState } from "react";
import type { LatencyEvent, LatencyStats } from "@/lib/types";
 
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";
 
// ── Helpers ──────────────────────────────────────────────────────────────────
 
function fmtLatency(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
 
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) + " " + d.toLocaleDateString([], { month: "short", day: "numeric" });
}
 
function withinSLA(minutes: number | null): boolean {
  return minutes !== null && minutes <= 120;
}
 
const SEVERITY_COLOR: Record<string, string> = {
  minor: "text-secondary",
  moderate: "text-primary",
  major: "text-tertiary",
  severe: "text-error",
  critical: "text-error",
};
 
const ALERT_BAR_COLOR: Record<string, string> = {
  low: "bg-secondary",
  medium: "bg-tertiary",
  high: "bg-primary",
  critical: "bg-error",
};
 
function LatencyBar({ minutes, max }: { minutes: number; max: number }) {
  const pct = Math.min(100, (minutes / Math.max(max, 120)) * 100);
  const sla = withinSLA(minutes);
  return (
    <div className="relative h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${sla ? "bg-secondary" : "bg-error"}`}
        style={{ width: `${pct}%` }}
      />
      {/* 2-hour SLA marker */}
      <div
        className="absolute top-0 bottom-0 w-px bg-on-surface-variant opacity-40"
        style={{ left: `${Math.min(100, (120 / Math.max(max, 120)) * 100)}%` }}
      />
    </div>
  );
}
 
// ── Main component ────────────────────────────────────────────────────────────
 
export function LatencyPanel() {
  const [data, setData] = useState<LatencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    let alive = true;
 
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard/latency`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: LatencyStats = await res.json();
        if (alive) {
          setData(json);
          setError(null);
        }
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }
 
    load();
    // Refresh every 60 seconds while the panel is mounted
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
 
  const summary = data?.summary;
  const events: LatencyEvent[] = data?.events ?? [];
  const maxLatency = events.reduce((m, e) => Math.max(m, e.latency_minutes ?? 0), 120);
 
  // ── Loading skeleton
  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-xl ghost-border shadow-sm p-6 space-y-4">
        <div className="h-5 w-48 animate-pulse rounded bg-surface-container-low" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-container-low" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container-low" />
          ))}
        </div>
      </div>
    );
  }
 
  // ── Error
  if (error) {
    return (
      <div className="bg-surface-container-lowest rounded-xl ghost-border shadow-sm p-6">
        <p className="text-error text-sm font-bold">Latency data unavailable: {error}</p>
      </div>
    );
  }
 
  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-surface-container-high flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-on-background">
            Detection → Alert Latency
          </h3>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">
            SLA target: &lt; 2 hours from first detection
          </p>
        </div>
        {summary?.within_2h_pct !== null && summary?.within_2h_pct !== undefined && (
          <div
            className={`text-right ${
              summary.within_2h_pct >= 80 ? "text-secondary" : "text-error"
            }`}
          >
            <div className="text-3xl font-black tabular-nums leading-none">
              {summary.within_2h_pct}%
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">
              within SLA
            </div>
          </div>
        )}
      </div>
 
      {/* Summary stat cards */}
      {summary && (
        <div className="grid grid-cols-3 divide-x divide-surface-container-high border-b border-surface-container-high">
          {[
            {
              label: "Avg Latency",
              value: fmtLatency(summary.avg_latency_minutes),
              ok: summary.avg_latency_minutes !== null && summary.avg_latency_minutes <= 120,
            },
            {
              label: "Fastest",
              value: fmtLatency(summary.min_latency_minutes),
              ok: true,
            },
            {
              label: "Slowest",
              value: fmtLatency(summary.max_latency_minutes),
              ok:
                summary.max_latency_minutes !== null &&
                summary.max_latency_minutes <= 120,
            },
          ].map(({ label, value, ok }) => (
            <div key={label} className="px-6 py-4 text-center">
              <div
                className={`text-2xl font-black tabular-nums leading-none ${
                  ok ? "text-on-surface" : "text-error"
                }`}
              >
                {value}
              </div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* No events yet */}
      {events.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">
          <div className="text-3xl mb-2">⏱</div>
          <p className="font-bold uppercase tracking-widest text-[11px]">
            No processed events yet
          </p>
          <p className="text-xs mt-1 opacity-70">
            Run the pipeline to generate detection latency data.
          </p>
        </div>
      ) : (
        <>
          {/* SLA legend */}
          <div className="px-6 pt-4 pb-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              Within 2h SLA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error inline-block" />
              Exceeded SLA
            </span>
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="w-px h-3 bg-on-surface-variant opacity-50 inline-block" />
              2h mark
            </span>
          </div>
 
          {/* Per-event rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                  <th className="px-6 py-3 w-2/5">Event</th>
                  <th className="px-6 py-3 w-1/6">First Seen</th>
                  <th className="px-6 py-3 w-1/6">Alert At</th>
                  <th className="px-6 py-3">Latency</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {events.map((ev) => {
                  const sla = withinSLA(ev.latency_minutes);
                  return (
                    <tr
                      key={ev.event_id}
                      className="border-b-4 border-background hover:bg-surface-container-low transition-colors"
                    >
                      {/* Event */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              sla
                                ? "bg-secondary/10 text-secondary"
                                : "bg-error/10 text-error"
                            }`}
                          >
                            {sla ? "✓ SLA" : "⚠ Late"}
                          </span>
                          <div>
                            <div className="font-bold text-on-surface truncate max-w-[220px]">
                              {ev.title}
                            </div>
                            <div
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                SEVERITY_COLOR[ev.severity_label] ??
                                "text-on-surface-variant"
                              }`}
                            >
                              {ev.event_type} · {ev.severity_label}
                            </div>
                          </div>
                        </div>
                      </td>
 
                      {/* First seen */}
                      <td className="px-6 py-3 text-on-surface-variant font-bold text-[11px] uppercase tabular-nums">
                        {fmtTime(ev.first_seen_at)}
                      </td>
 
                      {/* Alert generated */}
                      <td className="px-6 py-3 text-on-surface-variant font-bold text-[11px] uppercase tabular-nums">
                        {fmtTime(ev.alert_generated_at)}
                      </td>
 
                      {/* Latency bar + value */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <LatencyBar
                            minutes={ev.latency_minutes}
                            max={maxLatency}
                          />
                          <span
                            className={`text-xs font-black tabular-nums whitespace-nowrap ${
                              sla ? "text-secondary" : "text-error"
                            }`}
                          >
                            {fmtLatency(ev.latency_minutes)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}