"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Crown,
  ImagePlus,
  Loader2,
  ScanLine,
  Shirt,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageFade } from "@/components/ui/motion-primitives";
import { TextField } from "@/components/ui/text-field";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { maxWardrobeUploadBytes } from "@/features/wardrobe/schemas";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ScanStatus = "idle" | "preparing" | "analyzing" | "ready" | "saving" | "saved" | "error";

type ScanMetadata = {
  category: "Top" | "Bottom" | "Shoes" | "Outerwear";
  color: string;
  fabric: string;
  style: "Formal" | "Casual" | "Streetwear";
  confidence: number;
  provider: "openai" | "rule-based";
  wardrobeCategory: string;
};

type ScanUpload = {
  imageUrl: string;
  cloudinaryPublicId: string;
  fileSha256: string;
};

type Suggestion = {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl: string;
};

type ScanResponse = {
  scan: ScanUpload;
  metadata: ScanMetadata;
  suggestions: Suggestion[];
  error?: string;
  upgradeRequired?: boolean;
  usage?: {
    plan: "free" | "pro";
    aiScanLimit: number | null;
    aiScansUsedToday: number;
    remainingScans: number | null;
  };
};

type ScanUsage = NonNullable<ScanResponse["usage"]> & {
  dailyOutfitLimit?: number | null;
  outfitsUsedToday?: number;
  remainingOutfits?: number | null;
};

const itemTypeOptions = [
  ["shirt", "Shirt"],
  ["tshirt", "T-shirt"],
  ["jeans", "Jeans"],
  ["shoes", "Shoes"],
  ["jacket", "Jacket"],
  ["coat", "Coat"],
  ["blazer", "Blazer"]
] as const;

const maxOriginalBytes = 12 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Scanned item";
}

function itemTypeFromCategory(category?: ScanMetadata["category"]) {
  if (category === "Bottom") return "jeans";
  if (category === "Shoes") return "shoes";
  if (category === "Outerwear") return "jacket";
  return "shirt";
}

function validateFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }

  if (file.size > maxOriginalBytes) {
    return `Original image must be ${formatBytes(maxOriginalBytes)} or smaller.`;
  }

  return null;
}

function getScanUsagePercent(usage: ScanUsage | null) {
  if (!usage?.aiScanLimit) {
    return 100;
  }

  return Math.min(100, Math.round((usage.aiScansUsedToday / usage.aiScanLimit) * 100));
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    image.src = url;
  });
}

async function compressImage(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.84);
  });

  if (!blob || blob.size >= file.size || blob.size > maxWardrobeUploadBytes) {
    return file;
  }

  return new File([blob], `${getFileBaseName(file.name)}.webp`, {
    type: "image/webp",
    lastModified: Date.now()
  });
}

export function ScanWorkspace({
  billingEnabled = true,
  initialUsage
}: {
  billingEnabled?: boolean;
  initialUsage: ScanUsage;
}) {
  const router = useRouter();
  const { toast, ToastViewport } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanUpload | null>(null);
  const [metadata, setMetadata] = useState<ScanMetadata | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<ScanUsage>(initialUsage);
  const [upgradePrompt, setUpgradePrompt] = useState<ScanUsage | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<(typeof itemTypeOptions)[number][0]>("shirt");
  const isBusy = status === "preparing" || status === "analyzing" || status === "saving";
  const scansRemaining = usage.remainingScans;
  const scanUsagePercent = getScanUsagePercent(usage);

  function resetScanState() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    setPreviewUrl(null);
    setScan(null);
    setMetadata(null);
    setSuggestions([]);
    setMessage(null);
    setUpgradePrompt(null);
    setIsUpgradeModalOpen(false);
    setItemName("");
    setItemType("shirt");
    setIsDragging(false);
    setStatus("idle");
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }
    };
  }, [previewUrl]);

  async function prepareFile(file: File) {
    if (isBusy) {
      return;
    }

    const error = validateFile(file);

    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));
    setScan(null);
    setMetadata(null);
    setSuggestions([]);
    setMessage(null);
    setUpgradePrompt(null);
    setStatus("preparing");
    setItemName(getFileBaseName(file.name));

    try {
      const compressed = await compressImage(file);

      if (compressed.size > maxWardrobeUploadBytes) {
        throw new Error(`Optimized image must be ${formatBytes(maxWardrobeUploadBytes)} or smaller.`);
      }

      setStatus("idle");

      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }

      scanTimerRef.current = window.setTimeout(() => {
        void analyzePreparedFile(compressed);
      }, 350);
    } catch (caughtError) {
      setStatus("error");
      setMessage(caughtError instanceof Error ? caughtError.message : "Could not prepare image.");
    }
  }

  async function analyzePreparedFile(file: File) {
    if (isBusy) {
      return;
    }

    setStatus("analyzing");
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file, file.name);

      const response = await fetch("/api/wardrobe/scan", {
        method: "POST",
        headers: { "X-StyleMate-Client": "web" },
        body: formData
      });
      const data = (await response.json()) as ScanResponse;

      if (!response.ok) {
        if (data.upgradeRequired) {
          setUpgradePrompt(data.usage ?? null);
          setIsUpgradeModalOpen(true);
          throw new Error(data.error ?? "Free AI scan limit reached");
        }

        throw new Error(data.error ?? "Could not analyze clothing.");
      }

      setScan(data.scan);
      setMetadata(data.metadata);
      setSuggestions(data.suggestions);
      if (data.usage) {
        setUsage(data.usage);
      }
      setItemType(itemTypeFromCategory(data.metadata.category));
      setStatus("ready");
    } catch (caughtError) {
      setStatus("error");
      setMessage(caughtError instanceof Error ? caughtError.message : "Could not analyze clothing.");
    }
  }

  async function confirmAddToWardrobe() {
    if (status === "saving" || status === "saved") {
      return;
    }

    if (!scan || !metadata) {
      setMessage("Scan an image before adding it to wardrobe.");
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/wardrobe/scan/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StyleMate-Client": "web"
        },
        body: JSON.stringify({
          name: itemName || `${metadata.color} ${metadata.category}`,
          itemType,
          imageUrl: scan.imageUrl,
          cloudinaryPublicId: scan.cloudinaryPublicId,
          fileSha256: scan.fileSha256,
          metadata
        })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not add item to wardrobe.");
      }

      toast({ title: "Added to wardrobe", description: "Your scanned item is ready to style.", tone: "success" });
      resetScanState();
      router.refresh();
    } catch (caughtError) {
      setStatus("error");
      const description = caughtError instanceof Error ? caughtError.message : "Could not add item to wardrobe.";
      setMessage(description);
      toast({ title: "Could not add item", description, tone: "error" });
    }
  }

  return (
    <PageFade className="grid min-w-0 gap-6">
      <ToastViewport />
      {isUpgradeModalOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-[#c6c9e7]/80 bg-white p-6 shadow-2xl shadow-[#363b6c]/20"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
              <Crown className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold">Unlock Unlimited AI Scans</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              You used the free AI scan quota. Pro keeps your wardrobe scanning without limits.
            </p>
            <div className="mt-5 grid gap-3">
              {["Unlimited scans", "Faster AI", "Premium styling", "Priority recommendations"].map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-xl border border-[#c6c9e7]/70 bg-[#eaedfe]/60 px-3 py-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <UpgradeButton className="h-11 rounded-xl" disabled={!billingEnabled} />
              <Button className="h-11 rounded-xl" variant="secondary" onClick={() => setIsUpgradeModalOpen(false)}>
                Maybe Later
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      <section className="premium-card overflow-hidden rounded-2xl">
        <div className="border-b border-[#c6c9e7]/70 bg-[radial-gradient(circle_at_top_right,rgba(168,163,227,0.34),transparent_18rem),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(234,237,254,0.82))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="ai-active-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                <Sparkles className="size-3.5" aria-hidden="true" />
                AI stylist assistant
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">AI Wardrobe Scan</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Upload, drag, or capture a clothing image. StyleMate stores it securely, analyzes it, and helps you pair it with your wardrobe.
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-80">
              <div className="rounded-2xl border border-[#c6c9e7]/70 bg-white/78 p-4 shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">AI Scans Remaining</p>
                    <p className="mt-1 text-lg font-semibold">
                      {usage.plan === "pro" ? "Unlimited scans" : `${scansRemaining ?? 0} / ${usage.aiScanLimit ?? 10} scans left`}
                    </p>
                  </div>
                  {usage.plan === "pro" ? (
                    <span className="rounded-full bg-[#363b6c] px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-[#363b6c]/20">
                      PRO ACTIVE
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#c6c9e7]/45">
                  <div className="h-full rounded-full bg-[#363b6c] transition-all" style={{ width: `${scanUsagePercent}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
              <input
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void prepareFile(file);
                  event.target.value = "";
                }}
              />
              <input
                ref={captureInputRef}
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void prepareFile(file);
                  event.target.value = "";
                }}
              />
              <Button className="gradient-button rounded-xl text-white" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="size-4" aria-hidden="true" />
                Upload image
              </Button>
              <Button className="rounded-xl" variant="secondary" onClick={() => captureInputRef.current?.click()}>
                <Camera className="size-4" aria-hidden="true" />
                Capture
              </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6">
          <div
            className={cn(
              "grid min-h-44 cursor-pointer place-items-center rounded-xl border border-dashed p-5 text-center transition",
              isDragging ? "border-[#363b6c] bg-[#eaedfe]" : "border-[#c6c9e7]/80 bg-white/70 hover:border-[#363b6c] hover:bg-white"
            )}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void prepareFile(file);
            }}
          >
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
                <ScanLine className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold">Drop a clothing photo here</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Originals up to {formatBytes(maxOriginalBytes)} are compressed before scan.
              </p>
            </div>
          </div>

          {message ? (
            <p
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                status === "saved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              )}
            >
              {message}
            </p>
          ) : null}

          {upgradePrompt ? (
            <div className="rounded-xl border border-[#a8a3e3]/60 bg-[#eaedfe] p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#363b6c] text-white">
                  <Crown className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">Smart Upgrade unlocks unlimited scans</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Free plan includes {upgradePrompt.aiScanLimit ?? 10} AI scans per day. Pro adds unlimited scans, advanced recommendations, and priority responses.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <UpgradeButton className="rounded-xl" disabled={!billingEnabled} />
                    <Button className="rounded-xl" variant="secondary" onClick={() => setIsUpgradeModalOpen(true)}>
                      View benefits
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="premium-card min-w-0 rounded-2xl p-4">
          <div className="relative grid min-h-[520px] place-items-center overflow-hidden rounded-xl bg-[#f6f7ff]">
            {previewUrl ? (
              <Image src={scan?.imageUrl ?? previewUrl} alt="Scanned wardrobe item" fill className="object-contain p-3" unoptimized={!scan?.imageUrl} />
            ) : (
              <div className="text-center">
                <Shirt className="mx-auto size-14 text-[var(--accent)]" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold">Uploaded image preview</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Your scan image appears here.</p>
              </div>
            )}

            {isBusy ? (
              <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
                <div className="ai-card rounded-2xl p-5 text-center">
                  <Loader2 className="mx-auto size-7 animate-spin text-[var(--accent)]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">
                    {status === "preparing" ? "Optimizing image..." : status === "saving" ? "Adding to wardrobe..." : "Analyzing clothing..."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="grid min-w-0 gap-4">
          <div className="ai-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--accent)]">AI detected metadata</p>
                <h2 className="mt-1 text-xl font-semibold">Compare & confirm</h2>
              </div>
              {status === "saved" ? (
                <CheckCircle2 className="size-6 text-emerald-600" aria-hidden="true" />
              ) : status === "error" ? (
                <AlertCircle className="size-6 text-red-600" aria-hidden="true" />
              ) : (
                <WandSparkles className="size-6 text-[var(--accent)]" aria-hidden="true" />
              )}
            </div>

            {metadata ? (
              <div className="mt-5 grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">{metadata.category}</span>
                  <span className="rounded-full border border-[#c6c9e7]/70 bg-white/70 px-3 py-1 text-xs font-semibold text-[#64748b]">{metadata.color}</span>
                  <span className="rounded-full border border-[#c6c9e7]/70 bg-white/70 px-3 py-1 text-xs font-semibold text-[#64748b]">{metadata.style}</span>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-[var(--muted)]">Confidence</span>
                    <span className="font-semibold">{metadata.confidence}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                    <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${metadata.confidence}%` }} />
                  </div>
                </div>

                <dl className="grid gap-2">
                  {[
                    ["Fabric", metadata.fabric],
                    ["Analyzer", metadata.provider === "openai" ? "OpenAI Vision" : "Rule fallback"],
                    ["Wardrobe category", metadata.wardrobeCategory]
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-[#c6c9e7]/70 bg-white/70 px-4 py-3">
                      <dt className="text-sm text-[var(--muted)]">{label}</dt>
                      <dd className="text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>

                <TextField label="Item name" value={itemName} onChange={(event) => setItemName(event.target.value)} />
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Item type</span>
                  <select
                    className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none focus:border-[#363b6c]"
                    value={itemType}
                    onChange={(event) => setItemType(event.target.value as typeof itemType)}
                  >
                    {itemTypeOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <Button className="gradient-button h-12 rounded-xl text-white" disabled={status === "saving" || status === "saved"} onClick={() => void confirmAddToWardrobe()}>
                  {status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <WandSparkles className="size-4" aria-hidden="true" />}
                  Add to Wardrobe
                </Button>
              </div>
            ) : (
              <div className="mt-5 grid min-h-72 place-items-center rounded-xl border border-dashed border-[#c6c9e7]/80 bg-white/70 p-6 text-center">
                <div>
                  <ScanLine className="mx-auto size-9 text-[var(--accent)]" aria-hidden="true" />
                  <p className="mt-3 font-semibold">Waiting for scan</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">AI metadata will appear after analysis.</p>
                </div>
              </div>
            )}
          </div>

          <div className="premium-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Compare Outfit Suggestion</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Matching pants, tops, or shoes from your wardrobe.</p>
            {suggestions.length ? (
              <div className="mt-4 grid gap-3">
                {suggestions.map((item) => (
                  <article key={item.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#c6c9e7]/70 bg-white/70 p-2">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-subtle)]">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 truncate text-xs capitalize text-[var(--muted)]">{item.category} · {item.color}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-[#c6c9e7]/70 bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
                Scan results will look for useful outfit pairings once your wardrobe has matching pieces.
              </p>
            )}
          </div>
        </aside>
      </section>
    </PageFade>
  );
}
