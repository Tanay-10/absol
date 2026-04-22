"use client";

import { useState } from "react";
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
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-low" />
        ))}
      </div>
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
    <div className="space-y-8">
      {settings.map(({ key, label, description, min, max, step }) => (
        <div key={key} className="group flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-on-background">
                {label}
              </label>
              <p className="text-xs text-on-surface-variant opacity-50 mt-1">
                {description}
              </p>
            </div>
            <span className="text-lg font-bold text-on-background">
              {localThresholds[key]}
            </span>
          </div>
          
          <div className="relative flex items-center h-2">
             <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localThresholds[key]}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                className="w-full h-1.5 bg-surface-high rounded-full appearance-none cursor-pointer accent-primary"
              />
          </div>
        </div>
      ))}
      <div className="pt-4 border-t border-surface-high">
        <button
          onClick={() => {
            setLocalThresholds(thresholds);
            onUpdate(thresholds);
          }}
          className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity"
        >
          Reset to Factory Defaults
        </button>
      </div>
    </div>
  );
}
