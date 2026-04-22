"use client";

import { PageHeader } from "@/components/PageHeader";
import { usePipelineModel } from "@/hooks/usePipelineModel";
import { usePipelineRun } from "@/hooks/usePipelineRun";
import { SourceHealthTable } from "./SourceHealthTable";
import { RoutingControls } from "./RoutingControls";
import { ThresholdSettings } from "./ThresholdSettings";
import { PipelineEventQueue } from "./PipelineEventQueue";

export default function PipelinePage() {
  const model = usePipelineModel();
  const { run, running, status, buttonLabel } = usePipelineRun(async () => {
    await model.refreshAll();
  });

  const tone = status?.tone === "high" ? "critical" : status?.tone === "medium" ? "medium" : "neutral";

  return (
    <div className="flex flex-col gap-10 py-4">
      {/* Header section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
              {status ? status.message : "Pipeline Idle"}
            </span>
            <span className="label-sm opacity-40">System Administration</span>
          </div>
          <h1 className="display-lg text-on-background">
            Data Pipeline Oversight
          </h1>
          <p className="mt-6 text-xl text-on-surface-variant opacity-70 leading-relaxed">
            Monitor ingestion health, configure routing, and run the pipeline manually to synchronize theater assets.
          </p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <button
            onClick={() => run()}
            disabled={running || model.loading}
            className="metallic-cta min-w-[200px] rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all disabled:opacity-50"
          >
            {buttonLabel}
          </button>
          <p className="label-sm text-[10px] opacity-40">
            {model.pendingManualReview} events pending review · {model.readyDestinations} destinations
          </p>
        </div>
      </section>

      <section className="surface-card p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="label-sm text-on-surface-variant opacity-60">Ingestion Health</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Source Monitoring</h2>
          </div>
        </div>
        <SourceHealthTable
          sources={model.sourceHealth}
          loading={model.loading}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <section className="surface-card p-8">
           <div className="mb-8">
            <span className="label-sm text-on-surface-variant opacity-60">Notification Routing</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Output Channels</h2>
          </div>
          <RoutingControls
            destinations={model.destinations}
            loading={model.loading}
            onToggle={(id, enabled) => {
              const updated = model.config.routingDestinations.map((dest) =>
                dest.id === id ? { ...dest, enabled } : dest
              );
              model.updateConfig({
                ...model.config,
                routingDestinations: updated,
              });
            }}
          />
        </section>

        <section className="surface-card p-8">
          <div className="mb-8">
            <span className="label-sm text-on-surface-variant opacity-60">System Controls</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Threshold Settings</h2>
          </div>
          <ThresholdSettings
            thresholds={model.config.thresholds}
            loading={model.loading}
            onUpdate={(thresholds) => {
              model.updateConfig({
                ...model.config,
                thresholds,
              });
            }}
          />
        </section>
      </div>

      <section className="surface-card p-8">
        <div className="mb-8">
          <span className="label-sm text-on-surface-variant opacity-60">Event Buffer</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-on-background">Pipeline Event Queue</h2>
        </div>
        <PipelineEventQueue
          events={model.eventQueue}
          loading={model.loading}
        />
      </section>
    </div>
  );
}
