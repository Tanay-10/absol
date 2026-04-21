import { PageHeader } from "@/components/PageHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";

export default function ImpactPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        meta={
          <>
            <SeverityBadge tone="medium">Task 1 scaffold</SeverityBadge>
            <SeverityBadge tone="neutral">Route enabled</SeverityBadge>
          </>
        }
      />

      <SurfaceCard tone="muted" className="flex flex-1 items-center p-6">
        <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          The impact screen is intentionally a shell placeholder for now. Detailed
          exposure analysis arrives in its dedicated follow-up task.
        </p>
      </SurfaceCard>
    </div>
  );
}
