import type { ReactNode } from "react";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "glass" | "raised";
}

const TONE_CLASSES: Record<NonNullable<SurfaceCardProps["tone"]>, string> = {
  muted: "surface-tier-1",
  glass: "glass-panel",
  raised: "surface-tier-3",
};

export function SurfaceCard({
  children,
  className,
  tone = "muted",
}: SurfaceCardProps) {
  return (
    <section
      className={[
        "ghost-border rounded-[28px] shadow-[0_14px_34px_rgba(7,12,24,0.2)]",
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}
