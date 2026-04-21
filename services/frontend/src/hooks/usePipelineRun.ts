"use client";

import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";

type PipelineStatusTone = "low" | "medium" | "high";

interface PipelineStatus {
  tone: PipelineStatusTone;
  message: string;
}

export function usePipelineRun(afterRun?: () => Promise<unknown> | void) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<PipelineStatus | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setStatus({ tone: "medium", message: "Running pipeline..." });

    try {
      const result = await api.runPipeline();
      await afterRun?.();
      setStatus({
        tone: "low",
        message: `${result.events_found} events found, ${result.events_processed} processed`,
      });
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown pipeline error";
      setStatus({
        tone: "high",
        message: `Pipeline failed: ${message}`,
      });
      throw error;
    } finally {
      setRunning(false);
    }
  }, [afterRun]);

  const buttonLabel = useMemo(
    () => (running ? "Running pipeline..." : "Run pipeline"),
    [running]
  );

  return { run, running, status, buttonLabel };
}
