import { SurfaceCard } from "@/components/SurfaceCard";
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
      <SurfaceCard tone="muted" className="p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-48 rounded bg-[var(--surface-3)]" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-[var(--surface-3)]" />
            ))}
          </div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard tone="muted" className="overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Source health
        </h3>
        <span className="text-sm text-[var(--text-secondary)]">
          {sources.length} active {sources.length === 1 ? "source" : "sources"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--surface-3)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="pb-3">Source</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Events</th>
              <th className="pb-3">Alerts</th>
              <th className="pb-3">Last seen</th>
              <th className="pb-3">Lag</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                  No source data available
                </td>
              </tr>
            ) : (
              sources.map((source) => (
                <tr
                  key={source.source}
                  className="border-b border-[var(--surface-2)] transition-colors hover:bg-[var(--surface-2)]"
                >
                  <td className="py-3 font-mono text-sm text-[var(--text-primary)]">
                    {source.source}
                  </td>
                  <td className="py-3">
                    <SeverityBadge tone={TONE_MAP[source.tone]}>
                      {source.statusLabel}
                    </SeverityBadge>
                  </td>
                  <td className="py-3 text-sm text-[var(--text-secondary)]">
                    {source.eventCount}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-secondary)]">
                    {source.alertCount}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-secondary)]">
                    {source.lastDetectedAt
                      ? new Date(source.lastDetectedAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-secondary)]">
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
    </SurfaceCard>
  );
}
