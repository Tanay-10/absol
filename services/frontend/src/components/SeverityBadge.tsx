import type { ReactNode } from "react";

interface SeverityBadgeProps {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "low" | "medium" | "high" | "critical";
}

const TONE_CLASSES: Record<NonNullable<SeverityBadgeProps["tone"]>, string> = {
  neutral: "badge-stable",
  low: "badge-stable",
  medium: "badge-warning",
  high: "badge-warning",
  critical: "badge-critical",
};

export function SeverityBadge({
  children,
  className,
  tone = "neutral",
}: SeverityBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
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
