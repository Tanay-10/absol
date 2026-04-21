"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow = "Command deck",
  title = "Sovereign Observer",
  description = "Track live catastrophe movement, interpret portfolio exposure, and coordinate response from one operational frame.",
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <section className="flex flex-col gap-5 border-b border-[var(--border-ghost)] pb-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          {description}
        </p>
        {meta && <div className="mt-4 flex flex-wrap gap-2">{meta}</div>}
      </div>

      {actions && (
        <div className="xl:min-w-[320px] xl:max-w-[420px] xl:pl-6">{actions}</div>
      )}
    </section>
  );
}
