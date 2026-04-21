"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { useReadinessModel } from "@/hooks/useReadinessModel";

export default function ReadinessPage() {
  const model = useReadinessModel();
  const [, setReallocationState] = useState<Record<string, number>>({});

  // Generate stable demo chart data
  const chartData = useMemo(() => 
    Array.from({ length: 24 }).map((_, i) => {
      // Deterministic pseudo-random based on index
      const seed = (i * 9301 + 49297) % 233280;
      const value = (seed / 233280);
      return Math.max(20, value * 100);
    }),
    []
  );

  const handleResetConfig = useCallback(() => {
    model.resetConfig();
    setReallocationState({});
  }, [model]);

  const handleAddReserve = useCallback((poolId: string) => {
    setReallocationState(prev => ({
      ...prev,
      [poolId]: (prev[poolId] ?? 0) + 1,
    }));
    model.updateConfig(current => ({
      ...current,
      staffingPools: current.staffingPools.map(pool =>
        pool.id === poolId
          ? {
              ...pool,
              activeAgents: pool.activeAgents + 1,
              reserveAgents: Math.max(0, pool.reserveAgents - 1),
              concurrentCapacity: pool.concurrentCapacity + pool.concurrentCapacity / Math.max(1, pool.activeAgents),
            }
          : pool
      ),
    }));
  }, [model]);

  const handleAddOvertime = useCallback((poolId: string) => {
    setReallocationState(prev => ({
      ...prev,
      [poolId]: (prev[poolId] ?? 0) + 0.5,
    }));
    model.updateConfig(current => ({
      ...current,
      staffingPools: current.staffingPools.map(pool =>
        pool.id === poolId
          ? {
              ...pool,
              concurrentCapacity: Math.round(pool.concurrentCapacity * 1.15),
            }
          : pool
      ),
    }));
  }, [model]);

  const postureBadge = model.snapshot.posture === "critical"
    ? <SeverityBadge tone="critical">Critical posture</SeverityBadge>
    : model.snapshot.posture === "strained"
    ? <SeverityBadge tone="high">Strained posture</SeverityBadge>
    : <SeverityBadge tone="low">Ready posture</SeverityBadge>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Operational readiness"
        title="System saturation"
        description="Hybrid model combining live surge pressure from alerts and events with local staffing and capacity assumptions."
        meta={
          <>
            {postureBadge}
            <SeverityBadge tone="neutral">Hybrid data</SeverityBadge>
          </>
        }
        actions={
          <button
            type="button"
            onClick={handleResetConfig}
            className="ghost-border rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-ghost-strong)] hover:text-[var(--text-primary)]"
          >
            Reset config
          </button>
        }
      />

      {model.loading ? (
        <SurfaceCard tone="muted" className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-[var(--text-secondary)]">Loading readiness model...</p>
        </SurfaceCard>
      ) : (
        <>
          {/* Readiness headline */}
          <SurfaceCard tone="muted" className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  System readiness
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  Operational snapshot
                </h2>
              </div>
              <SeverityBadge tone="neutral">Live calculation</SeverityBadge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
              <div className="surface-tier-2 ghost-border flex flex-col rounded-[24px] p-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Readiness score
                </span>
                <span className={`text-3xl font-bold mt-1 ${
                  model.snapshot.posture === "critical" ? "text-[var(--accent-coral)]" :
                  model.snapshot.posture === "strained" ? "text-[var(--accent-amber)]" :
                  "text-[var(--accent-emerald)]"
                }`}>
                  {model.snapshot.score}
                </span>
                <span className="mt-1 text-xs text-[var(--text-tertiary)]">{model.snapshot.summary}</span>
              </div>
              <div className="surface-tier-2 ghost-border flex flex-col rounded-[24px] p-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Active alerts
                </span>
                <span className="text-2xl font-bold mt-1 text-[var(--accent-coral)]">
                  {model.snapshot.activeAlerts}
                </span>
                <span className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {model.snapshot.activeEvents} events total
                </span>
              </div>
              <div className="surface-tier-2 ghost-border flex flex-col rounded-[24px] p-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Est. claims
                </span>
                <span className="text-2xl font-bold mt-1 text-[var(--accent-amber)]">
                  {model.snapshot.estimatedClaims}
                </span>
                <span className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {model.snapshot.impactedZones} zones impacted
                </span>
              </div>
              <div className="surface-tier-2 ghost-border flex flex-col rounded-[24px] p-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Staffing util
                </span>
                <span className={`text-2xl font-bold mt-1 ${
                  model.snapshot.staffingUtilization >= 1 ? "text-[var(--accent-coral)]" :
                  model.snapshot.staffingUtilization >= 0.8 ? "text-[var(--accent-amber)]" :
                  "text-[var(--accent-emerald)]"
                }`}>
                  {Math.round(model.snapshot.staffingUtilization * 100)}%
                </span>
                <span className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {model.snapshot.totalCapacity} capacity
                </span>
              </div>
              <div className="surface-tier-2 ghost-border flex flex-col rounded-[24px] p-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Reserve pool
                </span>
                <span className="text-2xl font-bold mt-1 text-[var(--accent-cyan)]">
                  {model.snapshot.reserveCapacity}
                </span>
                <span className="mt-1 text-xs text-[var(--text-tertiary)]">agents available</span>
              </div>
            </div>
          </SurfaceCard>

          {/* 72-hour arrivals chart (simplified demo) */}
          <SurfaceCard tone="glass" className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Inbound pressure
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  72-hour arrivals
                </h2>
              </div>
              <SeverityBadge tone="neutral">Demo viz</SeverityBadge>
            </div>
            <div className="flex items-end gap-2 h-32">
              {chartData.map((height, i) => {
                const isHigh = height > 70;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all hover:brightness-110"
                    style={{
                      height: `${height}%`,
                      background: isHigh
                        ? "linear-gradient(180deg, rgba(255,155,143,0.6), rgba(255,155,143,0.3))"
                        : "linear-gradient(180deg, rgba(143,214,255,0.5), rgba(143,214,255,0.2))",
                    }}
                    title={`Hour ${i}: ${Math.round(height)}% pressure`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>Now</span>
              <span>24h</span>
              <span>48h</span>
              <span>72h</span>
            </div>
          </SurfaceCard>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tactical reallocation cards */}
            <SurfaceCard tone="muted" className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Staffing controls
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                    Tactical reallocation
                  </h2>
                </div>
                <SeverityBadge tone="neutral">Local only</SeverityBadge>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {model.staffingPools.map(pool => (
                  <div
                    key={pool.id}
                    className="surface-tier-2 ghost-border rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                          {pool.name}
                        </h3>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                          {pool.team} · {pool.supportedEventFamilies.join(", ") || "All families"}
                        </p>
                      </div>
                      <SeverityBadge
                        tone={
                          pool.tone === "critical" ? "critical" :
                          pool.tone === "watch" ? "high" :
                          "low"
                        }
                      >
                        {Math.round(pool.utilization * 100)}%
                      </SeverityBadge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-[var(--text-tertiary)]">Active</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {pool.activeAgents}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">Reserve</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {pool.reserveAgents}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">Capacity</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {pool.concurrentCapacity}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      {pool.recommendation}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddReserve(pool.id)}
                        disabled={pool.reserveAgents === 0}
                        className="flex-1 ghost-border rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-ghost-strong)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Pull reserve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddOvertime(pool.id)}
                        className="flex-1 ghost-border rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-ghost-strong)] hover:text-[var(--text-primary)]"
                      >
                        Add overtime
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {/* Zone readiness ledger */}
            <SurfaceCard tone="muted" className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Zone breakdown
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                    Readiness ledger
                  </h2>
                </div>
                <SeverityBadge tone="neutral">{model.zones.length} zones</SeverityBadge>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {model.zones.map(zone => (
                  <div
                    key={zone.zoneId}
                    className="surface-tier-2 ghost-border rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                          {zone.zoneName}
                        </h3>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                          {zone.activeEvents} events · {zone.activeAlerts} alerts
                        </p>
                      </div>
                      <SeverityBadge
                        tone={
                          zone.tone === "critical" ? "critical" :
                          zone.tone === "watch" ? "high" :
                          "low"
                        }
                      >
                        {zone.tone}
                      </SeverityBadge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[var(--text-tertiary)]">Claims</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {zone.estimatedClaims}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">Capacity</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {zone.staffedCapacity}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">Reserve</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {zone.reserveCapacity}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">Routes</span>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {zone.routingDestinations}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          {/* Source health monitoring */}
          <SurfaceCard tone="glass" className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Data pipeline
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  Source health
                </h2>
              </div>
              <SeverityBadge tone="neutral">{model.sourceHealth.length} sources</SeverityBadge>
            </div>
            <div className="space-y-2">
              {model.sourceHealth.map(source => (
                <div
                  key={source.source}
                  className="surface-tier-2 ghost-border rounded-xl p-3 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                      {source.source}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {source.eventCount} events · {source.alertCount} alerts
                      {source.minutesSinceLastEvent !== null && (
                        <> · {source.minutesSinceLastEvent}m ago</>
                      )}
                    </p>
                  </div>
                  <SeverityBadge
                    tone={
                      source.tone === "critical" ? "critical" :
                      source.tone === "watch" ? "high" :
                      "low"
                    }
                  >
                    {source.statusLabel}
                  </SeverityBadge>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </>
      )}
    </div>
  );
}
