"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
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

  const tone = model.snapshot.posture === "critical" ? 'critical' : model.snapshot.posture === 'strained' ? 'medium' : 'neutral';

  return (
    <div className="flex flex-col gap-10 py-4">
      {/* Header section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
              {model.snapshot.posture} Posture
            </span>
            <span className="label-sm opacity-40">Operational Readiness</span>
          </div>
          <h1 className="display-lg text-on-background">
            System Saturation
          </h1>
          <p className="mt-6 text-xl text-on-surface-variant opacity-70 leading-relaxed">
            Hybrid model combining live surge pressure from alerts and events with local staffing and capacity assumptions.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleResetConfig}
            className="rounded-xl bg-surface-high px-6 py-4 text-sm font-bold text-on-background transition-all hover:bg-surface-highest"
          >
            Reset Config
          </button>
        </div>
      </section>

      {model.loading ? (
        <div className="surface-card flex items-center justify-center p-20">
          <p className="text-lg font-bold text-on-surface-variant opacity-40 animate-pulse">Loading Readiness Model...</p>
        </div>
      ) : (
        <>
          {/* Readiness snapshot */}
          <section className="surface-card p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <span className="label-sm text-on-surface-variant opacity-60">System Readiness</span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Operational Snapshot</h2>
              </div>
              <span className="badge-stable rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Live Calculation</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
              <div className="rounded-2xl bg-surface-low p-6">
                <p className="label-sm text-[10px] opacity-40 mb-3 text-center">Readiness Score</p>
                <div className="flex flex-col items-center">
                  <span className={`text-5xl font-bold ${
                    model.snapshot.posture === "critical" ? "text-error" :
                    model.snapshot.posture === "strained" ? "text-warning" :
                    "text-on-background"
                  }`}>
                    {model.snapshot.score}
                  </span>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">{model.snapshot.summary}</span>
                </div>
              </div>

              {[
                { label: "Active Alerts", value: model.snapshot.activeAlerts, sub: `${model.snapshot.activeEvents} events total`, tone: 'critical' },
                { label: "Est. Claims", value: model.snapshot.estimatedClaims, sub: `${model.snapshot.impactedZones} zones impacted`, tone: 'medium' },
                { label: "Staffing Util", value: `${Math.round(model.snapshot.staffingUtilization * 100)}%`, sub: `${model.snapshot.totalCapacity} capacity`, tone: 'neutral' },
                { label: "Reserve Pool", value: model.snapshot.reserveCapacity, sub: "agents available", tone: 'neutral' }
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl bg-surface-low p-6">
                  <p className="label-sm text-[10px] opacity-40 mb-3">{stat.label}</p>
                  <p className="text-3xl font-bold text-on-background">{stat.value}</p>
                  <p className="mt-2 text-[10px] text-on-surface-variant opacity-50">{stat.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pressure Chart */}
          <section className="surface-card p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <span className="label-sm text-on-surface-variant opacity-60">Inbound Pressure</span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">72-Hour Arrivals</h2>
              </div>
              <span className="label-sm text-[10px] opacity-40">Predictive Capacity Model</span>
            </div>
            
            <div className="flex items-end gap-1 h-48 bg-surface-low rounded-2xl p-6 px-12">
              {chartData.map((height, i) => {
                const isHigh = height > 70;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all duration-300 hover:brightness-75 cursor-help ${isHigh ? 'bg-primary' : 'bg-on-surface-variant opacity-20'}`}
                    style={{ height: `${height}%` }}
                    title={`Hour ${i}: ${Math.round(height)}% pressure`}
                  />
                );
              })}
            </div>
            <div className="mt-6 flex justify-between px-12 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">
              <span>Current</span>
              <span>24h Future</span>
              <span>48h Future</span>
              <span>72h Threshold</span>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Staffing Controls */}
            <section className="surface-card p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <span className="label-sm text-on-surface-variant opacity-60">Staffing Controls</span>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Tactical Reallocation</h2>
                </div>
              </div>
              
              <div className="space-y-6">
                {model.staffingPools.map(pool => (
                  <div key={pool.id} className="rounded-2xl bg-surface-low p-6 transition-all hover:bg-surface-low/80">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-on-background">{pool.name}</h3>
                        <p className="text-xs text-on-surface-variant opacity-50">{pool.team} · {pool.supportedEventFamilies.join(", ") || "All families"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${pool.tone === 'critical' ? 'badge-critical' : pool.tone === 'watch' ? 'badge-warning' : 'badge-stable'}`}>
                        {Math.round(pool.utilization * 100)}% Util
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-surface-base rounded-xl p-3">
                        <p className="label-sm text-[9px] opacity-40">Active</p>
                        <p className="font-bold text-on-background">{pool.activeAgents}</p>
                      </div>
                      <div className="bg-surface-base rounded-xl p-3">
                        <p className="label-sm text-[9px] opacity-40">Reserve</p>
                        <p className="font-bold text-on-background">{pool.reserveAgents}</p>
                      </div>
                      <div className="bg-surface-base rounded-xl p-3">
                        <p className="label-sm text-[9px] opacity-40">Capacity</p>
                        <p className="font-bold text-on-background">{pool.concurrentCapacity}</p>
                      </div>
                    </div>

                    <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed mb-6">
                      {pool.recommendation}
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleAddReserve(pool.id)}
                        disabled={pool.reserveAgents === 0}
                        className="metallic-cta flex-1 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-30"
                      >
                        Pull Reserve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddOvertime(pool.id)}
                        className="flex-1 rounded-xl bg-surface-high px-4 py-2 text-xs font-bold text-on-background hover:bg-surface-highest transition-all"
                      >
                        Add Overtime
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Zone Ledger */}
            <section className="surface-card p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <span className="label-sm text-on-surface-variant opacity-60">Zone Breakdown</span>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Readiness Ledger</h2>
                </div>
                <span className="label-sm text-[10px] opacity-40">{model.zones.length} Zones Tracked</span>
              </div>

              <div className="space-y-4">
                {model.zones.map(zone => (
                  <div key={zone.zoneId} className="group relative rounded-xl p-5 transition-all hover:bg-surface-low">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-on-background">{zone.zoneName}</h3>
                        <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-widest font-bold">
                          {zone.activeEvents} events · {zone.activeAlerts} alerts
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${zone.tone === 'critical' ? 'badge-critical' : zone.tone === 'watch' ? 'badge-warning' : 'badge-stable'}`}>
                        {zone.tone}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="label-sm text-[9px] opacity-30">Claims</p>
                        <p className="font-bold text-sm text-on-background">{zone.estimatedClaims}</p>
                      </div>
                      <div>
                        <p className="label-sm text-[9px] opacity-30">Capacity</p>
                        <p className="font-bold text-sm text-on-background">{zone.staffedCapacity}</p>
                      </div>
                      <div>
                        <p className="label-sm text-[9px] opacity-30">Reserve</p>
                        <p className="font-bold text-sm text-on-background">{zone.reserveCapacity}</p>
                      </div>
                      <div>
                        <p className="label-sm text-[9px] opacity-30">Routes</p>
                        <p className="font-bold text-sm text-on-background">{zone.routingDestinations}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
