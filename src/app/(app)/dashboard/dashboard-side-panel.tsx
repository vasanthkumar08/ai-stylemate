"use client";

import dynamic from "next/dynamic";

const OutfitRecommendationPanel = dynamic(
  () =>
    import("@/features/recommendations/components/outfit-recommendation-panel").then(
      (mod) => mod.OutfitRecommendationPanel
    ),
  {
    loading: () => (
      <div className="premium-card h-96 animate-pulse rounded-2xl shimmer" />
    )
  }
);

const WardrobeUploadForm = dynamic(
  () => import("@/features/wardrobe/components/wardrobe-upload-form").then((mod) => mod.WardrobeUploadForm),
  {
    loading: () => (
      <div className="premium-card h-[720px] animate-pulse rounded-2xl shimmer" />
    )
  }
);

const UpgradeToProCard = dynamic(
  () => import("@/features/monetization/components/upgrade-to-pro-card").then((mod) => mod.UpgradeToProCard),
  {
    loading: () => (
      <div className="premium-card h-56 animate-pulse rounded-2xl shimmer" />
    )
  }
);

export function DashboardSidePanel() {
  return (
    <>
      <UpgradeToProCard />
      <OutfitRecommendationPanel />
      <WardrobeUploadForm />
    </>
  );
}
