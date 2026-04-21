import { PageHeader } from "@/components/PageHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SurfaceCard } from "@/components/SurfaceCard";

export default function ReadinessPage() {
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
          The readiness route now uses the shared Observer shell so later rehearsal
          views can slot into the same navigation and framing without another layout
          pass.
        </p>
      </SurfaceCard>
    </div>
  );
}
