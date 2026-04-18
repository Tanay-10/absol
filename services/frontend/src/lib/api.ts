import type {
  DashboardSummary,
  DashboardEvent,
  EventDetail,
  Alert,
  PipelineResult,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getDashboardSummary: () =>
    fetchAPI<DashboardSummary>("/dashboard/summary"),

  getEvents: (params?: { event_type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.event_type) query.set("event_type", params.event_type);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchAPI<DashboardEvent[]>(`/events${qs ? `?${qs}` : ""}`);
  },

  getEventDetail: (eventId: string) =>
    fetchAPI<EventDetail>(`/events/${eventId}`),

  getAlerts: (params?: { level?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.level) query.set("level", params.level);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return fetchAPI<Alert[]>(`/alerts${qs ? `?${qs}` : ""}`);
  },

  runPipeline: () =>
    fetchAPI<PipelineResult>("/pipeline/run", { method: "POST" }),
};
