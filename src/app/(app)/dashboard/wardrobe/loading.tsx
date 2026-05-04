import { AppShell } from "@/components/layout/app-shell";
import { WardrobeDashboardViewSkeleton } from "@/features/wardrobe/components/wardrobe-dashboard-view";

export default function WardrobeDashboardLoading() {
  return (
    <AppShell>
      <WardrobeDashboardViewSkeleton />
    </AppShell>
  );
}
