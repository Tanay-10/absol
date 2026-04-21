"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const ROUTE_COPY: Record<
  string,
  { eyebrow: string; title: string; description: string }
> = {
  "/": {
    eyebrow: "Command deck",
    title: "Sovereign Observer",
    description:
      "Track live catastrophe movement, interpret portfolio exposure, and keep the redesign grounded in one premium operational frame.",
  },
  "/impact": {
    eyebrow: "Impact analysis",
    title: "Exposure narratives",
    description:
      "Compare signals, radius models, and portfolio concentration without leaving the Observer shell.",
  },
  "/readiness": {
    eyebrow: "Readiness",
    title: "Scenario rehearsals",
    description:
      "Stage operator drills, executive updates, and decision support views in the same tonal workspace.",
  },
  "/pipeline": {
    eyebrow: "Pipeline",
    title: "Ingestion oversight",
    description:
      "Review extraction cadence, scoring, and promotion checkpoints with consistent shell controls.",
  },
};

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: PageHeaderProps) {
  const pathname = usePathname();
  const routeCopy =
    Object.entries(ROUTE_COPY).find(([route]) =>
      route === "/" ? pathname === "/" : pathname.startsWith(route)
    )?.[1] || ROUTE_COPY["/"];

  return (
    <section className="flex flex-col gap-5 border-b border-[var(--border-ghost)] pb-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          {eyebrow || routeCopy.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          {title || routeCopy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          {description || routeCopy.description}
        </p>
        {meta && <div className="mt-4 flex flex-wrap gap-2">{meta}</div>}
      </div>

      {actions && (
        <div className="xl:min-w-[320px] xl:max-w-[420px] xl:pl-6">{actions}</div>
      )}
    </section>
  );
}
