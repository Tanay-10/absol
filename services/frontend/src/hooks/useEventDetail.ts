"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { EventDetail } from "@/lib/types";

export function useEventDetail(eventId: string | null) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!eventId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getEventDetail(eventId);
      setDetail(data);
    } catch (err) {
      console.error("Failed to fetch event detail:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { detail, loading, refresh };
}
