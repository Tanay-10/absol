"use client";

import { useMemo } from "react";
import { useOperationalFeeds } from "@/hooks/useOperationalFeeds";
import { useOpsConfig } from "@/hooks/useOpsConfig";
import { createReadinessViewModel } from "@/lib/ops-derive";

export function useReadinessModel() {
  const feeds = useOperationalFeeds();
  const opsConfig = useOpsConfig();

  const viewModel = useMemo(
    () =>
      createReadinessViewModel({
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
