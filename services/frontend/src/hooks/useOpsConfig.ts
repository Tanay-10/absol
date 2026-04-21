"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDefaultOpsConfig,
  OPS_CONFIG_STORAGE_KEY,
} from "@/lib/ops-defaults";
import type { OpsConfig } from "@/lib/ops-types";

function normalizeConfig(value: unknown): OpsConfig {
  const fallback = createDefaultOpsConfig();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<OpsConfig>;

  return {
    zones: Array.isArray(candidate.zones) ? candidate.zones : fallback.zones,
    staffingPools: Array.isArray(candidate.staffingPools)
      ? candidate.staffingPools
      : fallback.staffingPools,
    routingDestinations: Array.isArray(candidate.routingDestinations)
      ? candidate.routingDestinations
      : fallback.routingDestinations,
    thresholds:
      candidate.thresholds && typeof candidate.thresholds === "object"
        ? { ...fallback.thresholds, ...candidate.thresholds }
        : fallback.thresholds,
  };
}

export function useOpsConfig() {
  const [config, setConfig] = useState<OpsConfig>(() => createDefaultOpsConfig());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hydrationTimer = window.setTimeout(() => {
      const storedValue = window.localStorage.getItem(OPS_CONFIG_STORAGE_KEY);
      if (!storedValue) {
        setHydrated(true);
        return;
      }

      try {
        setConfig(normalizeConfig(JSON.parse(storedValue)));
      } catch (error) {
        console.warn("Failed to parse ops config from localStorage", error);
        window.localStorage.removeItem(OPS_CONFIG_STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(OPS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config, hydrated]);

  const updateConfig = useCallback(
    (updater: OpsConfig | ((current: OpsConfig) => OpsConfig)) => {
      setConfig((current) =>
        normalizeConfig(
          typeof updater === "function"
            ? (updater as (current: OpsConfig) => OpsConfig)(current)
            : updater
        )
      );
    },
    []
  );

  const resetConfig = useCallback(() => {
    setConfig(createDefaultOpsConfig());
  }, []);

  return {
    config,
    hydrated,
    storageKey: OPS_CONFIG_STORAGE_KEY,
    updateConfig,
    resetConfig,
  };
}
