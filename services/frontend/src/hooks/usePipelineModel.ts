"use client";

import { useMemo } from "react";
import { useOperationalFeeds } from "@/hooks/useOperationalFeeds";
import { useOpsConfig } from "@/hooks/useOpsConfig";
import { createPipelineViewModel } from "@/lib/ops-derive";

export function usePipelineModel() {
  const feeds = useOperationalFeeds();
  const opsConfig = useOpsConfig();

  const viewModel = useMemo(
    () =>
      createPipelineViewModel({
        summary: feeds.summary,
        events: feeds.events,
        alerts: feeds.alerts,
        config: opsConfig.config,
      }),
    [feeds.alerts, feeds.events, feeds.summary, opsConfig.config]
  );

  return {
    ...viewModel,
    config: opsConfig.config,
    configHydrated: opsConfig.hydrated,
    loading: feeds.loading || !opsConfig.hydrated,
    refreshAll: feeds.refreshAll,
    updateConfig: opsConfig.updateConfig,
    resetConfig: opsConfig.resetConfig,
  };
}
