"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Camera,
  Gauge,
  ImagePlus,
  Loader2,
  Lock,
  ScanLine,
  Settings,
  Shield,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCog,
  Users,
  WandSparkles
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
};

type AdminStats = {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    totalOutfits: number;
    revenue: number;
    uploadCount: number;
    aiRequestsUsed: number;
  };
  live: {
    users: number;
    uploads: number;
  };
  monetization: {
    freeUsers: number;
    proUsers: number;
    conversionRate: number;
    mostUsedFeature: string;
    totalScans: number;
    freeScans: number;
    proScans: number;
    conversionEvents: number;
  };
  trend: Array<{
    label: string;
    users: number;
    outfits: number;
    uploads: number;
  }>;
};

type FeatureFlags = {
  aiScanEnabled: boolean;
  outfitGeneratorEnabled: boolean;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "banned";
  lastLogin: string | null;
};

type ScanMetadata = {
  clothingType: string;
  color: string;
  category: string;
  fabricEstimate: string;
  confidence: number;
};

const sidebarItems = [
  ["Dashboard", Activity],
  ["Users", Users],
  ["Analytics", BarChart3],
  ["AI Scan", ScanLine],
  ["Settings", Settings]
] as const;

const kpiConfig = [
  ["Total Users", "totalUsers", Users],
  ["Active Users (24h)", "activeUsers", Activity],
  ["Total Outfits Generated", "totalOutfits", WandSparkles],
  ["Revenue", "revenue", Gauge],
  ["Upload Count", "uploadCount", ImagePlus],
  ["AI Requests Used", "aiRequestsUsed", Sparkles]
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatKpi(key: keyof AdminStats["kpis"], value: number) {
  if (key === "revenue") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }

  return formatNumber(value);
}

function mapCategoryToItemType(category: string) {
  const normalized = category.toLowerCase();

  if (normalized.includes("bottom")) return "jeans";
  if (normalized.includes("shoe")) return "shoes";
  if (normalized.includes("outer")) return "jacket";
  if (normalized.includes("dress")) return "dress";

  return "shirt";
}

export function AdminDashboard({ adminUser }: { adminUser: AdminUser }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(true);
  const [outfitGeneratorEnabled, setOutfitGeneratorEnabled] = useState(true);
  const [aiScanEnabled, setAiScanEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(78);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanMetadata, setScanMetadata] = useState<ScanMetadata | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "analyzing" | "adding">("idle");
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const metricCards = useMemo(() => {
    if (!stats) {
      return [];
    }

    return kpiConfig.map(([label, key, Icon]) => ({
      label,
      key,
      Icon,
      value: stats.kpis[key]
    }));
  }, [stats]);

  async function loadAdminData() {
    try {
      const [statsResponse, usersResponse, flagsResponse] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/feature-flags", { cache: "no-store" })
      ]);
      const statsJson = (await statsResponse.json()) as AdminStats & { error?: string };
      const usersJson = (await usersResponse.json()) as { users?: ManagedUser[]; error?: string };
      const flagsJson = (await flagsResponse.json()) as { flags?: FeatureFlags; error?: string };

      if (!statsResponse.ok) {
        throw new Error(statsJson.error ?? "Could not load admin stats.");
      }

      if (!usersResponse.ok) {
        throw new Error(usersJson.error ?? "Could not load admin users.");
      }

      if (!flagsResponse.ok) {
        throw new Error(flagsJson.error ?? "Could not load feature flags.");
      }

      setStats(statsJson);
      setUsers(usersJson.users ?? []);
      setAiScanEnabled(flagsJson.flags?.aiScanEnabled ?? false);
      setOutfitGeneratorEnabled(flagsJson.flags?.outfitGeneratorEnabled ?? true);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAdminData();
    }, 0);
    const interval = window.setInterval(() => {
      void loadAdminData();
    }, 15000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scanPreview) {
        URL.revokeObjectURL(scanPreview);
      }
    };
  }, [scanPreview]);

  async function runUserAction(userId: string, action: "ban" | "promote" | "delete") {
    if (action === "delete") {
      const deleteResponse = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { "X-StyleMate-Client": "web" }
      });

      if (!deleteResponse.ok) {
        setError("Could not delete user.");
        return;
      }
    } else {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-StyleMate-Client": "web" },
        body: JSON.stringify({ userId, action })
      });

      if (!response.ok) {
        setError("Could not update user.");
        return;
      }
    }

    await loadAdminData();
  }

  async function updateFeatureFlag(updates: Partial<FeatureFlags>) {
    const response = await fetch("/api/admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-StyleMate-Client": "web" },
      body: JSON.stringify(updates)
    });
    const data = (await response.json().catch(() => ({}))) as { flags?: FeatureFlags; error?: string };

    if (!response.ok || !data.flags) {
      setError(data.error ?? "Could not update feature flag.");
      return;
    }

    setAiScanEnabled(data.flags.aiScanEnabled);
    setOutfitGeneratorEnabled(data.flags.outfitGeneratorEnabled);
  }

  function selectScanFile(file: File | null) {
    if (scanPreview) {
      URL.revokeObjectURL(scanPreview);
    }

    setScanFile(file);
    setScanPreview(file ? URL.createObjectURL(file) : null);
    setScanMetadata(null);
    setScanMessage(null);
  }

  async function analyzeScan() {
    if (!scanFile) {
      setScanMessage("Choose or capture an image first.");
      return;
    }

    setScanStatus("analyzing");
    setScanMessage(null);

    try {
      const formData = new FormData();
      formData.set("image", scanFile);

      const response = await fetch("/api/admin/scan-analyze", {
        method: "POST",
        headers: { "X-StyleMate-Client": "web" },
        body: formData
      });
      const data = (await response.json()) as { metadata?: ScanMetadata; error?: string };

      if (!response.ok || !data.metadata) {
        throw new Error(data.error ?? "Could not analyze scan.");
      }

      setScanMetadata(data.metadata);
    } catch (caughtError) {
      setScanMessage(caughtError instanceof Error ? caughtError.message : "Could not analyze scan.");
    } finally {
      setScanStatus("idle");
    }
  }

  async function confirmScan() {
    if (!scanFile || !scanMetadata) {
      return;
    }

    setScanStatus("adding");
    setScanMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", scanFile);
      formData.set("name", `${scanMetadata.color} ${scanMetadata.clothingType}`);
      formData.set("itemType", mapCategoryToItemType(scanMetadata.category));
      formData.set("color", scanMetadata.color);
      formData.set("fabric", scanMetadata.fabricEstimate);
      formData.set("season", "all-season");
      formData.set("fit", "regular");

      const response = await fetch("/api/wardrobe/upload", {
        method: "POST",
        headers: { "X-StyleMate-Client": "web" },
        body: formData
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not add item to wardrobe.");
      }

      setScanMessage("Scan confirmed and added to wardrobe.");
      selectScanFile(null);
    } catch (caughtError) {
      setScanMessage(caughtError instanceof Error ? caughtError.message : "Could not add item to wardrobe.");
    } finally {
      setScanStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-[#eaedfe] text-[#111827]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(168,163,227,0.5),transparent_34rem),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.7),transparent_24rem),linear-gradient(180deg,#ffffff_0%,#eaedfe_100%)]" />
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-[#c6c9e7]/70 bg-white/72 px-5 py-5 shadow-2xl shadow-[#363b6c]/10 backdrop-blur-xl lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/25">
              <Shield className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">StyleMate AI</p>
              <p className="text-xs text-[#64748b]">Enterprise Admin</p>
            </div>
          </div>

          <nav className="mt-8 flex gap-2 overflow-x-auto lg:grid lg:overflow-visible">
            {sidebarItems.map(([label, Icon]) => (
              <button
                key={label}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                  activeNav === label ? "bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20" : "text-[#64748b] hover:bg-[#eaedfe] hover:text-[#363b6c]"
                )}
                type="button"
                onClick={() => setActiveNav(label)}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-4">
            <Lock className="size-5 text-[#363b6c]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Admin verified</p>
            <p className="mt-1 truncate text-xs text-[#64748b]">{adminUser.email}</p>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-6 sm:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#363b6c]">Control Center</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-[#64748b]">Monitor users, AI usage, wardrobe uploads, and product controls.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#c6c9e7]/70 bg-white/70 px-4 py-3 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
              <div>
                <p className="text-xs text-[#64748b]">Live users</p>
                <p className="font-semibold">{formatNumber(stats?.live.users ?? 0)}</p>
              </div>
              <div className="h-9 w-px bg-[#c6c9e7]" />
              <div>
                <p className="text-xs text-[#64748b]">Live uploads</p>
                <p className="font-semibold">{formatNumber(stats?.live.uploads ?? 0)}</p>
              </div>
            </div>
          </header>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
          ) : null}

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-2xl border border-[#c6c9e7]/70 bg-white/70" />
                ))
              : metricCards.map(({ label, key, Icon, value }) => (
                  <article key={label} className="rounded-2xl border border-[#c6c9e7]/70 bg-white/78 p-5 shadow-2xl shadow-[#363b6c]/10 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-[#64748b]">{label}</p>
                        <p className="mt-3 text-3xl font-semibold">{formatKpi(key, value)}</p>
                      </div>
                      <span className="grid size-11 place-items-center rounded-xl bg-[#a8a3e3]/20 text-[#363b6c]">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                    </div>
                  </article>
                ))}
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Free users", formatNumber(stats?.monetization.freeUsers ?? 0)],
              ["Pro users", formatNumber(stats?.monetization.proUsers ?? 0)],
              ["Conversion rate", `${stats?.monetization.conversionRate ?? 0}%`],
              ["Total scans", formatNumber(stats?.monetization.totalScans ?? 0)],
              ["Free scans", formatNumber(stats?.monetization.freeScans ?? 0)],
              ["Pro scans", formatNumber(stats?.monetization.proScans ?? 0)],
              ["Conversion events", formatNumber(stats?.monetization.conversionEvents ?? 0)],
              ["Most used feature", (stats?.monetization.mostUsedFeature ?? "outfit_generation").replace(/_/g, " ")]
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-[#c6c9e7]/70 bg-white/78 p-5 shadow-2xl shadow-[#363b6c]/10 backdrop-blur-xl">
                <p className="text-sm text-[#64748b]">{label}</p>
                <p className="mt-3 text-2xl font-semibold capitalize">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-3">
            <ChartCard title="User growth" type="line" data={stats?.trend ?? []} dataKey="users" />
            <ChartCard title="Outfit generation trend" type="area" data={stats?.trend ?? []} dataKey="outfits" />
            <ChartCard title="Upload activity" type="bar" data={stats?.trend ?? []} dataKey="uploads" />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <UserManagement users={users} onAction={runUserAction} />
            <AiControlPanel
              aiRecommendationsEnabled={aiRecommendationsEnabled}
              outfitGeneratorEnabled={outfitGeneratorEnabled}
              confidenceThreshold={confidenceThreshold}
              onToggleAi={() => setAiRecommendationsEnabled((value) => !value)}
              aiScanEnabled={aiScanEnabled}
              onToggleScan={() => void updateFeatureFlag({ aiScanEnabled: !aiScanEnabled })}
              onToggleOutfit={() => void updateFeatureFlag({ outfitGeneratorEnabled: !outfitGeneratorEnabled })}
              onConfidenceChange={setConfidenceThreshold}
            />
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-300">Important new feature</p>
                <h2 className="mt-1 text-2xl font-semibold">Smart Wardrobe Scan</h2>
                <p className="mt-2 text-sm text-slate-400">Upload or capture an image and review AI-detected outfit metadata.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  type="file"
                  onChange={(event) => selectScanFile(event.target.files?.[0] ?? null)}
                />
                <input
                  ref={captureInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  type="file"
                  onChange={(event) => selectScanFile(event.target.files?.[0] ?? null)}
                />
                <Button className="rounded-xl bg-white/10 text-white hover:bg-white/15" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="size-4" aria-hidden="true" />
                  Upload image
                </Button>
                <Button className="rounded-xl bg-blue-500 hover:bg-blue-600" onClick={() => captureInputRef.current?.click()}>
                  <Camera className="size-4" aria-hidden="true" />
                  Capture image
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="min-h-80 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {scanPreview ? (
                  <div className="relative min-h-80">
                    <Image src={scanPreview} alt="Uploaded scan" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="grid min-h-80 place-items-center p-8 text-center">
                    <div>
                      <ScanLine className="mx-auto size-10 text-blue-300" aria-hidden="true" />
                      <p className="mt-3 text-sm font-medium">Uploaded image preview</p>
                      <p className="mt-1 text-xs text-slate-500">Select a wardrobe image to begin scanning.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">AI detected metadata</h3>
                  <Button className="rounded-xl bg-blue-500 hover:bg-blue-600" disabled={!scanFile || scanStatus === "analyzing"} onClick={() => void analyzeScan()}>
                    {scanStatus === "analyzing" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                    Analyze
                  </Button>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    ["Clothing type", scanMetadata?.clothingType],
                    ["Color", scanMetadata?.color],
                    ["Category", scanMetadata?.category],
                    ["Fabric estimate", scanMetadata?.fabricEstimate],
                    ["Confidence", scanMetadata ? `${Math.round(scanMetadata.confidence * 100)}%` : undefined]
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                      <span className="text-sm text-slate-400">{label}</span>
                      <span className="text-sm font-semibold">{value ?? "Pending"}</span>
                    </div>
                  ))}
                </div>

                <Button className="mt-5 h-12 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600" disabled={!scanMetadata || !scanFile || scanStatus === "adding"} onClick={() => void confirmScan()}>
                  {scanStatus === "adding" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <WandSparkles className="size-4" aria-hidden="true" />}
                  Confirm & Add to Wardrobe
                </Button>

                {scanMessage ? <p className="mt-3 text-sm text-slate-300">{scanMessage}</p> : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  type,
  data,
  dataKey
}: {
  title: string;
  type: "line" | "area" | "bar";
  data: AdminStats["trend"];
  dataKey: "users" | "outfits" | "uploads";
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <Line type="monotone" dataKey={dataKey} stroke="#60a5fa" strokeWidth={3} dot={false} />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <Area type="monotone" dataKey={dataKey} stroke="#38bdf8" fill="#38bdf855" />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
              <Bar dataKey={dataKey} fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function UserManagement({
  users,
  onAction
}: {
  users: ManagedUser[];
  onAction: (userId: string, action: "ban" | "promote" | "delete") => Promise<void>;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="mt-1 text-sm text-slate-400">Admin-only controls for accounts and roles.</p>
        </div>
        <UserCog className="size-6 text-blue-300" aria-hidden="true" />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["User ID", "Name", "Email", "Role", "Status", "Last login", "Actions"].map((heading) => (
                <th key={heading} className="border-b border-white/10 px-3 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/10 last:border-0">
                <td className="max-w-36 truncate px-3 py-4 font-mono text-xs text-slate-400">{user.id}</td>
                <td className="px-3 py-4 font-medium">{user.name}</td>
                <td className="px-3 py-4 text-slate-300">{user.email}</td>
                <td className="px-3 py-4">
                  <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-200">{user.role}</span>
                </td>
                <td className="px-3 py-4">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", user.status === "active" ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200")}>
                    {user.status}
                  </span>
                </td>
                <td className="px-3 py-4 text-slate-400">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/15" type="button" onClick={() => void onAction(user.id, "ban")}>
                      Ban
                    </button>
                    <button className="rounded-lg bg-blue-500/20 px-2.5 py-1.5 text-xs font-medium text-blue-100 hover:bg-blue-500/30" type="button" onClick={() => void onAction(user.id, "promote")}>
                      Promote
                    </button>
                    <button className="rounded-lg bg-red-500/20 p-1.5 text-red-100 hover:bg-red-500/30" type="button" onClick={() => void onAction(user.id, "delete")} aria-label={`Delete ${user.email}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AiControlPanel({
  aiRecommendationsEnabled,
  outfitGeneratorEnabled,
  aiScanEnabled,
  confidenceThreshold,
  onToggleAi,
  onToggleScan,
  onToggleOutfit,
  onConfidenceChange
}: {
  aiRecommendationsEnabled: boolean;
  outfitGeneratorEnabled: boolean;
  aiScanEnabled: boolean;
  confidenceThreshold: number;
  onToggleAi: () => void;
  onToggleScan: () => void;
  onToggleOutfit: () => void;
  onConfidenceChange: (value: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <h2 className="text-xl font-semibold">AI Control Panel</h2>
      <p className="mt-1 text-sm text-slate-400">Operational controls for recommendation services.</p>

      <div className="mt-5 grid gap-4">
        <ControlToggle label="AI recommendations" enabled={aiRecommendationsEnabled} onToggle={onToggleAi} />
        <ControlToggle label="AI scan feature" enabled={aiScanEnabled} onToggle={onToggleScan} />
        <ControlToggle label="Outfit generator" enabled={outfitGeneratorEnabled} onToggle={onToggleOutfit} />
        <label className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <span className="flex items-center justify-between gap-4 text-sm font-medium">
            Confidence threshold
            <span className="text-blue-300">{confidenceThreshold}%</span>
          </span>
          <input
            className="accent-blue-500"
            max={99}
            min={40}
            type="range"
            value={confidenceThreshold}
            onChange={(event) => onConfidenceChange(Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}

function ControlToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10" type="button" onClick={onToggle}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-slate-500">{enabled ? "Enabled" : "Disabled"}</span>
      </span>
      {enabled ? <ToggleRight className="size-8 text-blue-300" aria-hidden="true" /> : <ToggleLeft className="size-8 text-slate-500" aria-hidden="true" />}
    </button>
  );
}
