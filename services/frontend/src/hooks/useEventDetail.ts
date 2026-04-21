"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { EventDetail } from "@/lib/types";

export function useEventDetail(eventId: string | null) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!eventId) {
      setDetail(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEventDetail(eventId);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      setError(
        err instanceof Error ? err.message : "Failed to fetch event detail."
      );
      console.error("Failed to fetch event detail:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(initialLoad);
  }, [refresh]);

  return { detail, loading, refresh, error };
}
