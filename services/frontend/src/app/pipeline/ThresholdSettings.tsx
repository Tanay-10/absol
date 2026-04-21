import { useState } from "react";
import { SurfaceCard } from "@/components/SurfaceCard";
import type { ThresholdSettings as ThresholdSettingsType } from "@/lib/ops-types";

interface ThresholdSettingsProps {
  thresholds: ThresholdSettingsType;
  loading: boolean;
  onUpdate: (thresholds: ThresholdSettingsType) => void;
}

export function ThresholdSettings({ thresholds, loading, onUpdate }: ThresholdSettingsProps) {
  const [localThresholds, setLocalThresholds] = useState(thresholds);

  const handleChange = (key: keyof ThresholdSettingsType, value: number) => {
    const updated = { ...localThresholds, [key]: value };
    setLocalThresholds(updated);
    onUpdate(updated);
  };

  if (loading) {
    return (
      <SurfaceCard tone="muted" className="p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-48 rounded bg-[var(--surface-3)]" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded bg-[var(--surface-3)]" />
            ))}
          </div>
        </div>
      </SurfaceCard>
    );
  }

  const settings = [
    {
      key: "readinessWarningScore" as const,
      label: "Readiness warning score",
      description: "Trigger strained posture at this score",
      min: 0,
      max: 100,
      step: 5,
    },
    {
      key: "readinessCriticalScore" as const,
      label: "Readiness critical score",
      description: "Trigger critical posture at this score",
      min: 0,
      max: 100,
      step: 5,
    },
    {
      key: "maxAlertLoadPerCoordinator" as const,
      label: "Max alerts per coordinator",
      description: "Alert capacity per coordinator",
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: "maxClaimsLoadPerAgent" as const,
      label: "Max claims per agent",
      description: "Claim capacity per agent",
      min: 1,
      max: 50,
      step: 5,
    },
    {
      key: "staleSourceMinutes" as const,
      label: "Stale source threshold (minutes)",
      description: "Mark source as stale after this time",
      min: 30,
      max: 480,
      step: 30,
    },
    {
      key: "quietSourceMinutes" as const,
      label: "Quiet source threshold (minutes)",
      description: "Mark source as quiet after this time",
      min: 5,
      max: 240,
      step: 5,
    },
  ];

  return (
    <SurfaceCard tone="muted" className="overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Threshold settings
        </h3>
        <button
          onClick={() => setLocalThresholds(thresholds)}
          className="text-sm text-[var(--accent-cyan)] transition-opacity hover:opacity-80"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {settings.map(({ key, label, description, min, max, step }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                {label}
              </label>
              <span className="text-sm font-semibold text-[var(--accent-cyan)]">
                {localThresholds[key]}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={localThresholds[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--surface-3)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent-cyan)]"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              {description}
            </p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
