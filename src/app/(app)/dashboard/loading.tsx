import { AppShell } from "@/components/layout/app-shell";
import { WardrobeDashboardSkeleton } from "@/features/wardrobe/components/wardrobe-dashboard";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <WardrobeDashboardSkeleton />
        <aside className="min-w-0">
          <div className="premium-card h-[720px] animate-pulse rounded-2xl shimmer" />
        </aside>
      </div>
    </AppShell>
  );
}
