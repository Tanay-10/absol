"use client";

import { SeverityBadge } from "@/components/SeverityBadge";
import type { SourceHealthRow } from "@/lib/ops-types";

interface SourceHealthTableProps {
  sources: SourceHealthRow[];
  loading: boolean;
}

const TONE_MAP: Record<string, "low" | "medium" | "critical"> = {
  healthy: "low",
  watch: "medium",
  critical: "critical",
};

export function SourceHealthTable({ sources, loading }: SourceHealthTableProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-low" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left label-sm opacity-40 border-b border-surface-high">
            <th className="pb-4 pr-3">Source Identifier</th>
            <th className="pb-4 pr-3">Operational Status</th>
            <th className="pb-4 pr-3 text-right">Events</th>
            <th className="pb-4 pr-3 text-right">Alerts</th>
            <th className="pb-4 pr-3 text-right">Last Sync</th>
            <th className="pb-4 text-right">Lag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-low">
          {sources.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-on-surface-variant opacity-40 italic font-bold">
                No active source data detected in theater.
              </td>
            </tr>
          ) : (
            sources.map((source) => (
              <tr
                key={source.source}
                className="group transition-colors hover:bg-surface-low/50"
              >
                <td className="py-4 pr-3 font-bold text-on-background uppercase tracking-tight">
                  {source.source}
                </td>
                <td className="py-4 pr-3">
                  <SeverityBadge tone={TONE_MAP[source.tone]}>
                    {source.statusLabel}
                  </SeverityBadge>
                </td>
                <td className="py-4 pr-3 text-right font-bold">
                  {source.eventCount}
                </td>
                <td className="py-4 pr-3 text-right font-bold">
                  {source.alertCount}
                </td>
                <td className="py-4 pr-3 text-right text-on-surface-variant opacity-60">
                  {source.lastDetectedAt
                    ? new Date(source.lastDetectedAt).toLocaleTimeString()
                    : "—"}
                </td>
                <td className="py-4 text-right font-bold text-on-background">
                  {source.minutesSinceLastEvent !== null
                    ? `${source.minutesSinceLastEvent}m`
                    : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
