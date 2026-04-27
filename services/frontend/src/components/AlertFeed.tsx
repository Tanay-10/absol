"use client";

import type { Alert } from "@/lib/types";
import {
  formatRelativeTime,
} from "@/lib/dashboard";

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
  onAlertClick: (eventId: string) => void;
  selectedEventId?: string | null;
}

export function AlertFeed({
  alerts,
  loading,
}: AlertFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-container-low" />
        ))}
      </div>
    );
  }

  const displayAlerts = alerts.slice(0, 5);

  return (
    <div className="space-y-4">
      {displayAlerts.map((alert, index) => {
        const tone = alert.alert_level;
        const colorClass = tone === 'critical' ? 'bg-error' : tone === 'high' || tone === 'medium' ? 'bg-tertiary' : 'bg-secondary';
        const containerClass = tone === 'critical' ? 'bg-error-container' : 'bg-surface-container-high';

        return (
          <div 
            key={alert.id} 
            className="flex gap-3 relative before:absolute before:left-[11px] before:top-6 before:bottom-[-16px] before:w-px before:bg-surface-container-high last:before:hidden"
          >
            <div className={`w-6 h-6 rounded-full ${containerClass} flex items-center justify-center shrink-0 z-10`}>
              <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-0.5">
                {formatRelativeTime(alert.generated_at)} • {alert.alert_level.toUpperCase()} ALERT
              </p>
              <p className="text-sm text-on-surface font-semibold leading-snug">
                {alert.recommended_action}
              </p>
            </div>
          </div>
        );
      })}
      
      {alerts.length === 0 && (
        <p className="text-sm text-on-surface-variant italic py-4">No recent activity detected.</p>
      )}
    </div>
  );
}
