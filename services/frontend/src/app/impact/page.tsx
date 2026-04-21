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
          The shell, navigation, and content frame are now live for impact analysis.
          Detailed exposure workflows land in later tasks on top of this shared
          structure.
        </p>
      </SurfaceCard>
    </div>
  );
}
