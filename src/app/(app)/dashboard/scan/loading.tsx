import { AppShell } from "@/components/layout/app-shell";

export default function WardrobeScanLoading() {
  return (
    <AppShell>
      <div className="grid animate-pulse gap-6">
        <div className="premium-card h-80 rounded-2xl shimmer" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="premium-card h-[560px] rounded-2xl shimmer" />
          <div className="grid gap-4">
            <div className="premium-card h-96 rounded-2xl shimmer" />
            <div className="premium-card h-72 rounded-2xl shimmer" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
