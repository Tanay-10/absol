"use client";

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
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-low" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {destinations.length === 0 ? (
        <p className="py-12 text-center text-on-surface-variant opacity-40 italic font-bold">
          No routing destinations configured.
        </p>
      ) : (
        destinations.map((dest) => (
          <div
            key={dest.id}
            className={`flex items-center justify-between rounded-xl p-5 transition-all duration-200 ${
              dest.enabled ? "bg-surface-low ring-1 ring-primary/5 shadow-sm" : "bg-surface-high/20 opacity-60"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-xl opacity-60">{CHANNEL_ICONS[dest.channel] || "📡"}</span>
                <span className="font-bold text-on-background">
                  {dest.name}
                </span>
                <SeverityBadge tone={TONE_MAP[dest.tone]}>
                  P{dest.priority}
                </SeverityBadge>
              </div>
              <p className="mt-2 text-xs text-on-surface-variant opacity-60 font-medium">
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
              <div className="peer h-6 w-11 rounded-full bg-surface-high after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
        ))
      )}
    </div>
  );
}
