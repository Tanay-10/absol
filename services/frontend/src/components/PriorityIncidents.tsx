"use client";

import Link from "next/link";
import {
  compareIncidents,
  formatCompactAmount,
  getAlertTone,
  getEventTone,
  getRegionLabel,
} from "@/lib/dashboard";
import type { Alert, DashboardEvent } from "@/lib/types";
import { useRouter } from "next/navigation";

interface PriorityIncidentsProps {
  alerts: Alert[];
  events: DashboardEvent[];
  loading: boolean;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export function PriorityIncidents({
  alerts,
  events,
  loading,
  selectedEventId,
  onEventSelect,
}: PriorityIncidentsProps) {
  const router = useRouter();
  const alertsByEventId = new Map(alerts.map((alert) => [alert.event_id, alert]));
  const incidentRows = [...events]
    .sort((left, right) => compareIncidents(left, right, alertsByEventId))
    .slice(0, 6);

  if (loading && incidentRows.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((row) => (
          <div key={row} className="h-20 animate-pulse rounded-xl bg-surface-container-lowest" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-container-high flex justify-between items-center">
        <h3 className="text-lg font-bold text-on-background">Active Priority Incidents</h3>
        <Link href="/events" className="text-sm font-semibold text-primary hover:text-on-surface-variant transition-colors flex items-center gap-1 uppercase tracking-widest text-[10px]">
          View Full Register &rarr;
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
              <th className="px-6 py-3 w-1/4">Event Identification</th>
              <th className="px-6 py-3 w-1/5">Status/Severity</th>
              <th className="px-6 py-3 w-1/6">Est. Exposure</th>
              <th className="px-6 py-3 w-1/6">Detected (Elapsed)</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {incidentRows.map((event) => {
              const alert = alertsByEventId.get(event.id);
              const tone = alert ? getAlertTone(alert.alert_level) : getEventTone(event.severity_label);
              const isSelected = selectedEventId === event.id;

              return (
                <tr 
                  key={event.id} 
                  className={`border-b-4 border-background hover:bg-surface-container-low transition-colors group cursor-pointer ${isSelected ? 'bg-surface-container-low' : ''}`}
                  onClick={() => onEventSelect(event.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface text-lg">
                        {event.event_type === 'cyclone' ? '🌀' : event.event_type === 'wildfire' ? '🔥' : '⚠️'}
                      </div>
                      <div>
                        <div className="font-bold text-on-surface truncate max-w-[200px]">{event.title}</div>
                        <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{getRegionLabel(event)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${tone === 'critical' ? 'badge-critical' : tone === 'medium' ? 'badge-warning' : 'badge-stable'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tone === 'critical' ? 'bg-error' : tone === 'medium' ? 'bg-tertiary' : 'bg-secondary'}`}></span>
                      {alert ? alert.alert_level : event.severity_label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{alert ? formatCompactAmount(alert.estimated_total_amount) : '—'}</div>
                    <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{alert ? `${alert.total_policies_affected} Policies` : 'Calculating...'}</div>
                  </td>
                  <td className="px-6 py-4">
                  {(() => {
                    const ts = (event as any).first_seen_at ?? event.detected_at;
                    const ms = Date.now() - new Date(ts).getTime();
                    const mins = ms / 60_000;
                    const elapsed =
                      mins < 1 ? 'just now' :
                      mins < 60 ? `${Math.round(mins)}m ago` :
                      (() => { const h = Math.floor(mins / 60); const m = Math.round(mins % 60); return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`; })();
                    const hasAlert = !!alert;
                    const color =
                      !hasAlert ? 'text-on-surface-variant' :   // still processing — neutral
                      mins <= 90 ? 'text-secondary' :            // within SLA — green
                      mins <= 120 ? 'text-tertiary' :            // approaching — amber
                      'text-error';                              // breached — red
                    return (
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${color}`}>{elapsed}</span>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                          {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-primary border border-outline-variant px-3 py-1.5 rounded hover:bg-surface-container-high bg-white uppercase tracking-widest"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/events?event=${event.id}`);
                      }}
                    >
                      Deep Dive
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
