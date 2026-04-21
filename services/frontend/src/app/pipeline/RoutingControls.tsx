import { SurfaceCard } from "@/components/SurfaceCard";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { RoutingDestinationView } from "@/lib/ops-types";

interface RoutingControlsProps {
  destinations: RoutingDestinationView[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => void;
}

const CHANNEL_ICONS: Record<string, string> = {
  slack: "💬",
  queue: "📋",
  email: "📧",
};

const TONE_MAP: Record<string, "low" | "medium" | "critical"> = {
  healthy: "low",
  watch: "medium",
  critical: "critical",
};

export function RoutingControls({ destinations, loading, onToggle }: RoutingControlsProps) {
  if (loading) {
    return (
      <SurfaceCard tone="muted" className="p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-48 rounded bg-[var(--surface-3)]" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded bg-[var(--surface-3)]" />
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
          Routing destinations
        </h3>
        <span className="text-sm text-[var(--text-secondary)]">
          {destinations.filter((d) => d.enabled).length}/{destinations.length} active
        </span>
      </div>

      <div className="space-y-3">
        {destinations.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No routing destinations configured
          </p>
        ) : (
          destinations.map((dest) => (
            <div
              key={dest.id}
              className="flex items-center justify-between rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] p-4 transition-colors hover:bg-[var(--surface-3)]"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CHANNEL_ICONS[dest.channel] || "📡"}</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {dest.name}
                  </span>
                  <SeverityBadge tone={TONE_MAP[dest.tone]}>
                    P{dest.priority}
                  </SeverityBadge>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {dest.target} · {dest.matchedEventIds.length} events · {dest.matchedAlertIds.length} alerts
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={dest.enabled}
                  onChange={(e) => onToggle(dest.id, e.target.checked)}
                />
                <div className="peer h-6 w-11 rounded-full bg-[var(--surface-4)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--accent-cyan)] peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-cyan)] peer-focus:ring-opacity-50"></div>
              </label>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}
