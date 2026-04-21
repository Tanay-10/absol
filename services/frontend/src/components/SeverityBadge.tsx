import type { ReactNode } from "react";

interface SeverityBadgeProps {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "low" | "medium" | "high" | "critical";
}

const TONE_CLASSES: Record<NonNullable<SeverityBadgeProps["tone"]>, string> = {
  neutral:
    "border-[rgba(143,214,255,0.22)] bg-[rgba(143,214,255,0.12)] text-[var(--accent-cyan)]",
  low: "border-[rgba(143,228,179,0.24)] bg-[rgba(143,228,179,0.12)] text-[var(--accent-emerald)]",
  medium:
    "border-[rgba(242,207,141,0.24)] bg-[rgba(242,207,141,0.12)] text-[var(--accent-amber)]",
  high: "border-[rgba(255,155,143,0.24)] bg-[rgba(255,155,143,0.12)] text-[var(--accent-coral)]",
  critical:
    "border-[rgba(201,178,255,0.26)] bg-[rgba(201,178,255,0.14)] text-[var(--accent-violet)]",
};

export function SeverityBadge({
  children,
  className,
  tone = "neutral",
}: SeverityBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
