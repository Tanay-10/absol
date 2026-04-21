"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardEvent } from "@/lib/types";

export function useEvents(refreshInterval = 30000) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getEvents({ limit: 100 });
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void refresh();
    }, 0);
    const intervalId = setInterval(refresh, refreshInterval);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(intervalId);
    };
  }, [refresh, refreshInterval]);

  return { events, loading, refresh };
}
