export type PlanName = "free" | "pro";
export type MeteredFeature = "outfit" | "ai_scan";

export const planEntitlements = {
  free: {
    dailyOutfitLimit: 3,
    aiScanLimit: 10,
    advancedRecommendations: false,
    priority: "standard",
    stylingSuggestions: "basic"
  },
  pro: {
    dailyOutfitLimit: null,
    aiScanLimit: null,
    advancedRecommendations: true,
    priority: "priority",
    stylingSuggestions: "advanced"
  }
} as const;

export function normalizePlan(value: string | null | undefined): PlanName {
  return value === "pro" ? "pro" : "free";
}
