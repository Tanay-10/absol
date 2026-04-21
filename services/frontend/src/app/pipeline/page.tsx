"use client";

import { PageHeader } from "@/components/PageHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
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

  const statusTone = status?.tone === "high" ? "critical" : status?.tone === "medium" ? "medium" : "low";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Data pipeline oversight"
        description="Monitor ingestion health, configure routing, and run the pipeline manually."
        meta={
          <>
            <SeverityBadge tone="neutral">Live data</SeverityBadge>
            {status && (
              <SeverityBadge tone={statusTone}>
                {status.message}
              </SeverityBadge>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Pipeline controls
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {model.pendingManualReview} events pending manual review · {model.readyDestinations} active destinations
            </p>
          </div>
          <button
            onClick={() => run()}
            disabled={running || model.loading}
            className="rounded-lg bg-[var(--accent-cyan)] px-6 py-2.5 text-sm font-semibold text-[var(--surface-1)] transition-all hover:opacity-90 disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      <SourceHealthTable
        sources={model.sourceHealth}
        loading={model.loading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      <PipelineEventQueue
        events={model.eventQueue}
        loading={model.loading}
      />
    </div>
  );
}
