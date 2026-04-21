"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Alert } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000; // 15 seconds

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getAlerts({ limit: 50 });
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void refresh();
    }, 0);
    timerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialLoad);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  return { alerts, loading, refresh };
}
