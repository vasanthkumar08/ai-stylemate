import { AppShell } from "@/components/layout/app-shell";
import { canUseAiScan } from "@/features/feature-flags/service";
import { checkUserPlan } from "@/features/monetization/service";
import { ScanDisabledCard } from "@/features/wardrobe/scan/scan-disabled-card";
import { ScanWorkspace } from "@/features/wardrobe/scan/scan-workspace";
import { requireAuthenticatedPage } from "@/lib/guards/server";

export const dynamic = "force-dynamic";

export default async function WardrobeScanPage() {
  const { supabase, appUser } = await requireAuthenticatedPage();
  const scanAccess = await canUseAiScan(appUser, supabase);
  const usage = await checkUserPlan(supabase, appUser.id);

  return (
    <AppShell>
      {scanAccess.allowed ? <ScanWorkspace initialUsage={usage} /> : <ScanDisabledCard isPro={appUser.plan === "pro"} />}
    </AppShell>
  );
}
