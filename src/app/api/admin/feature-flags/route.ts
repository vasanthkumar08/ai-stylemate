import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getFeatureFlags, updateFeatureFlags } from "@/features/feature-flags/service";
import { withAdminApi } from "@/lib/admin/api";
import { jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

const featureFlagsSchema = z.object({
  aiScanEnabled: z.boolean().optional(),
  outfitGeneratorEnabled: z.boolean().optional()
});

export const GET = withAdminApi(async () => {
  const flags = await getFeatureFlags();
  return NextResponse.json({ flags });
});

export const PATCH = withAdminApi(async ({ request }: { request: NextRequest }) => {
  const parsed = featureFlagsSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.issues.at(0)?.message ?? "Feature flag request is invalid.", 400);
  }

  const updates: { aiScanEnabled?: boolean; outfitGeneratorEnabled?: boolean } = {};

  if (typeof parsed.data.aiScanEnabled === "boolean") {
    updates.aiScanEnabled = parsed.data.aiScanEnabled;
  }

  if (typeof parsed.data.outfitGeneratorEnabled === "boolean") {
    updates.outfitGeneratorEnabled = parsed.data.outfitGeneratorEnabled;
  }

  const flags = await updateFeatureFlags(updates);
  return NextResponse.json({ flags });
});
