"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export function useDashboard(refreshInterval = 30000) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void refresh();
    }, 0);
    const id = setInterval(refresh, refreshInterval);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(id);
    };
  }, [refresh, refreshInterval]);

  return { summary, loading, refresh };
}
