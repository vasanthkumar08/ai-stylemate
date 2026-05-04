"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  WandSparkles
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  maxWardrobeUploadBytes,
  wardrobeUploadFormSchema,
  wardrobeUploadItemSchema,
  type WardrobeUploadFormInput
} from "@/features/wardrobe/schemas";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  getFileBaseName,
  getFriendlyUploadError,
  guessWardrobeItemType,
  MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES,
  MAX_WARDROBE_UPLOAD_FILES,
  validateWardrobeFiles
} from "./wardrobe-upload-utils";

type UploadStatus = "ready" | "compressing" | "uploading" | "uploaded" | "error";

type SelectedWardrobeFile = {
  clientId: string;
  file: File;
  uploadFile: File;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  error?: string | undefined;
  uploadedUrl?: string | undefined;
};

type UploadedWardrobeItem = {
  id: string;
  name: string;
  image_url: string;
};

const categoryOptions = [
  ["shirt", "Shirt"],
  ["tshirt", "T-shirt"],
  ["jeans", "Jeans"],
  ["blazer", "Blazer"],
  ["shoes", "Shoes"],
  ["accessories", "Accessories"],
  ["dress", "Dress"],
  ["skirt", "Skirt"],
  ["shorts", "Shorts"],
  ["sweater", "Sweater"],
  ["jacket", "Jacket"],
  ["coat", "Coat"],
  ["bag", "Bag"],
  ["jewelry", "Jewelry"],
  ["activewear", "Activewear"],
  ["other", "Other"]
] as const;

const seasonOptions = [
  ["all-season", "All-season"],
  ["summer", "Summer"],
  ["winter", "Winter"]
] as const;

const fitOptions = [
  ["slim", "Slim"],
  ["regular", "Regular"],
  ["oversized", "Oversized"]
] as const;

const accept = "image/jpeg,image/png,image/webp";

function createDefaultItem(file: File, clientId: string): WardrobeUploadFormInput["items"][number] {
  return {
    clientId,
    name: getFileBaseName(file.name),
    itemType: guessWardrobeItemType(file.name),
    color: "",
    season: "all-season",
    fabric: "",
    brand: "",
    fit: "regular"
  };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
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
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
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

function uploadWithProgress(
  formData: FormData,
  onProgress: (progress: number) => void
): Promise<{ item: UploadedWardrobeItem }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(96, Math.round((event.loaded / event.total) * 100)));
      }
    };

    request.onload = () => {
      let response: { item?: UploadedWardrobeItem; error?: string } = {};

      try {
        response = JSON.parse(request.responseText || "{}") as typeof response;
      } catch {
        response = {};
      }

      if (request.status >= 200 && request.status < 300 && response.item) {
        resolve({ item: response.item });
        return;
      }

      reject(new Error(getFriendlyUploadError(request.status, response.error)));
    };

    request.onerror = () => reject(new Error(getFriendlyUploadError(0)));
    request.ontimeout = () => reject(new Error("Upload timed out. Retry in a moment."));
    request.timeout = 45_000;
    request.open("POST", "/api/wardrobe/upload");
    request.setRequestHeader("X-StyleMate-Client", "web");
    request.send(formData);
  });
}

export function WardrobeUploadSystem() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { toast, ToastViewport } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedWardrobeFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const form = useForm<WardrobeUploadFormInput>({
    resolver: zodResolver(wardrobeUploadFormSchema),
    defaultValues: { items: [] },
    mode: "onBlur"
  });
  const { append, fields, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const uploadableCount = useMemo(
    () => selectedFiles.filter((file) => file.status === "ready" || file.status === "error").length,
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [selectedFiles]);

  async function addFiles(fileList: FileList | File[]) {
    const incomingFiles = Array.from(fileList);
    const validation = validateWardrobeFiles(
      incomingFiles,
      selectedFiles.map((item) => item.file)
    );

    validation.errors.forEach((message) => {
      toast({ title: "Image skipped", description: message, tone: "error" });
    });

    if (!validation.accepted.length) {
      return;
    }

    const prepared = validation.accepted.map((file) => {
      const clientId = crypto.randomUUID();
      append(createDefaultItem(file, clientId));

      return {
        clientId,
        file,
        uploadFile: file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "compressing" as const
      };
    });

    setSelectedFiles((current) => [...current, ...prepared]);

    await Promise.all(
      prepared.map(async (item) => {
        try {
          const uploadFile = await compressImage(item.file);
          const sizeError =
            uploadFile.size > maxWardrobeUploadBytes
              ? `Optimized image must be ${formatBytes(maxWardrobeUploadBytes)} or smaller.`
              : undefined;

          setSelectedFiles((current) =>
            current.map((file) =>
              file.clientId === item.clientId
                ? {
                    ...file,
                    uploadFile,
                    progress: 0,
                    status: sizeError ? "error" : "ready",
                    error: sizeError
                  }
                : file
            )
          );
        } catch (error) {
          setSelectedFiles((current) =>
            current.map((file) =>
              file.clientId === item.clientId
                ? {
                    ...file,
                    progress: 0,
                    status: "error",
                    error: error instanceof Error ? error.message : "Image preparation failed."
                  }
                : file
            )
          );
        }
      })
    );
  }

  function removeFile(index: number, clientId: string) {
    setSelectedFiles((current) => {
      const target = current.find((file) => file.clientId === clientId);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((file) => file.clientId !== clientId);
    });
    remove(index);
  }

  async function uploadOne(clientId: string, index: number) {
    const item = selectedFiles.find((file) => file.clientId === clientId);
    const values = form.getValues(`items.${index}`);

    if (!item) {
      toast({ title: "Image missing", description: "Select the image again and retry.", tone: "error" });
      return false;
    }

    const parsed = wardrobeUploadItemSchema.safeParse(values);

    if (!parsed.success) {
      await form.trigger(`items.${index}`);
      toast({
        title: "Check item details",
        description: parsed.error.issues.at(0)?.message ?? "Complete the required metadata before upload.",
        tone: "error"
      });
      return false;
    }

    const cleanName = parsed.data.name?.trim() || getFileBaseName(item.file.name);
    const formData = new FormData();
    formData.set("file", item.uploadFile, item.uploadFile.name);
    formData.set("name", cleanName);
    formData.set("itemType", parsed.data.itemType);
    formData.set("season", parsed.data.season);
    formData.set("fit", parsed.data.fit);

    for (const field of ["color", "fabric", "brand"] as const) {
      const value = parsed.data[field]?.trim();

      if (value) {
        formData.set(field, value);
      }
    }

    setSelectedFiles((current) =>
      current.map((file) =>
        file.clientId === clientId ? { ...file, status: "uploading", progress: 1, error: undefined } : file
      )
    );

    try {
      const result = await uploadWithProgress(formData, (progress) => {
        setSelectedFiles((current) =>
          current.map((file) => (file.clientId === clientId ? { ...file, progress } : file))
        );
      });

      setSelectedFiles((current) =>
        current.map((file) =>
          file.clientId === clientId
            ? {
                ...file,
                status: "uploaded",
                progress: 100,
                error: undefined,
                uploadedUrl: result.item.image_url
              }
            : file
        )
      );
      router.refresh();
      return true;
    } catch (error) {
      setSelectedFiles((current) =>
        current.map((file) =>
          file.clientId === clientId
            ? {
                ...file,
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Upload failed."
              }
            : file
        )
      );
      return false;
    }
  }

  async function uploadAll() {
    if (isUploading) {
      return;
    }

    if (!selectedFiles.length) {
      toast({ title: "No images selected", description: "Add at least one wardrobe image first.", tone: "error" });
      return;
    }

    const valid = await form.trigger("items");

    if (!valid) {
      toast({
        title: "Complete item details",
        description: "Fix the highlighted fields before uploading.",
        tone: "error"
      });
      return;
    }

    setIsUploading(true);
    let uploaded = 0;

    for (const [index, field] of fields.entries()) {
      const item = selectedFiles.find((file) => file.clientId === field.clientId);

      if (!item || item.status === "uploaded" || item.status === "compressing" || item.status === "uploading") {
        continue;
      }

      if (await uploadOne(field.clientId, index)) {
        uploaded += 1;
      }
    }

    setIsUploading(false);

    if (uploaded > 0) {
      toast({
        title: "Wardrobe updated",
        description: `${uploaded} item${uploaded === 1 ? "" : "s"} uploaded securely.`,
        tone: "success"
      });
    }
  }

  const debouncedUploadAll = useDebouncedCallback(() => {
    void uploadAll();
  }, 250);

  return (
    <section className="premium-card min-w-0 overflow-hidden rounded-2xl">
      <ToastViewport />
      <div className="border-b border-[#c6c9e7]/70 bg-[radial-gradient(circle_at_top_right,rgba(168,163,227,0.34),transparent_18rem),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(234,237,254,0.82))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="ai-active-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Secure Cloudinary upload
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Build your AI wardrobe</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Upload up to {MAX_WARDROBE_UPLOAD_FILES} polished item photos with metadata for better outfit
              recommendations.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center md:w-72">
            <div className="rounded-xl border border-[#c6c9e7]/70 bg-white/70 p-3">
              <p className="text-lg font-semibold">{selectedFiles.length}</p>
              <p className="text-xs text-[var(--muted)]">Selected</p>
            </div>
            <div className="rounded-xl border border-[#c6c9e7]/70 bg-white/70 p-3">
              <p className="text-lg font-semibold">{uploadableCount}</p>
              <p className="text-xs text-[var(--muted)]">Ready</p>
            </div>
            <div className="rounded-xl border border-[#c6c9e7]/70 bg-white/70 p-3">
              <p className="text-lg font-semibold">{formatBytes(maxWardrobeUploadBytes)}</p>
              <p className="text-xs text-[var(--muted)]">Max</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 p-5 sm:p-6">
        <div
          className={cn(
            "grid min-h-56 cursor-pointer place-items-center rounded-lg border border-dashed p-5 text-center transition",
            isDragging
              ? "border-[var(--accent)] bg-[var(--surface-subtle)]"
              : "border-[#c6c9e7]/80 bg-white/70 hover:border-[#363b6c] hover:bg-white"
          )}
          onClick={() => inputRef.current?.click()}
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
            void addFiles(event.dataTransfer.files);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            accept={accept}
            className="sr-only"
            multiple
            type="file"
            onChange={(event) => {
              if (event.target.files) {
                void addFiles(event.target.files);
                event.target.value = "";
              }
            }}
          />
          <div className="max-w-md">
            <span className="mx-auto grid size-14 place-items-center rounded-xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
              <ImagePlus className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-semibold">Drag images here or browse</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              JPG, JPEG, PNG, or WebP. Originals up to {formatBytes(MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES)}
              are optimized before upload.
            </p>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-6 text-center">
            <WandSparkles className="mx-auto size-8 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold">No uploads queued</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Add clear item photos on a simple background. Metadata appears per image after selection.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            {fields.map((field, index) => {
              const item = selectedFiles.find((file) => file.clientId === field.clientId);
              const fieldErrors = form.formState.errors.items?.[index];

              return (
                <article
                  key={field.id}
                  className="grid min-w-0 gap-4 rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:p-4"
                >
                  <div className="min-w-0">
                    {item ? (
                      <div
                        className="aspect-[4/5] w-full rounded-lg border border-[var(--border)] bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.previewUrl})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="aspect-[4/5] w-full animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
                    )}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          item?.status === "error" ? "bg-red-500" : "bg-[var(--accent)]"
                        )}
                        style={{ width: `${item?.status === "compressing" ? 28 : item?.progress ?? 0}%` }}
                      />
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-xs text-[var(--muted)]">
                      {item?.status === "compressing" || item?.status === "uploading" ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                      ) : item?.status === "uploaded" ? (
                        <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                      ) : item?.status === "error" ? (
                        <AlertCircle className="size-3 text-red-600" aria-hidden="true" />
                      ) : null}
                      <span className="truncate">{item?.error ?? item?.status ?? "ready"}</span>
                    </p>
                  </div>

                  <div className="grid min-w-0 gap-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item?.file.name ?? "Wardrobe image"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {item
                            ? `${formatBytes(item.file.size)}${
                                item.uploadFile.size !== item.file.size
                                  ? ` optimized to ${formatBytes(item.uploadFile.size)}`
                                  : ""
                              }`
                            : "Preparing image"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {item?.status === "error" ? (
                          <button
                            className="rounded-md p-2 text-[var(--accent)] transition hover:bg-[var(--surface-subtle)]"
                            type="button"
                            onClick={() => void uploadOne(field.clientId, index)}
                            aria-label={`Retry ${item.file.name}`}
                          >
                            <RefreshCw className="size-4" aria-hidden="true" />
                          </button>
                        ) : null}
                        <button
                          className="rounded-md p-2 text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-red-600"
                          type="button"
                          onClick={() => removeFile(index, field.clientId)}
                          aria-label={`Remove ${item?.file.name ?? "image"}`}
                          disabled={item?.status === "uploading"}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-4 md:grid-cols-2">
                      <TextField
                        label="Item name"
                        placeholder="White oxford shirt"
                        error={fieldErrors?.name?.message}
                        {...form.register(`items.${index}.name`)}
                      />
                      <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor={`category-${field.id}`}>
                          Category
                        </label>
                        <select
                          id={`category-${field.id}`}
                          className="h-11 min-w-0 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition-colors focus:border-[#363b6c]"
                          {...form.register(`items.${index}.itemType`)}
                        >
                          {categoryOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {fieldErrors?.itemType?.message ? (
                          <p className="text-sm text-red-600">{fieldErrors.itemType.message}</p>
                        ) : null}
                      </div>
                      <TextField
                        label="Color"
                        placeholder="Navy"
                        error={fieldErrors?.color?.message}
                        {...form.register(`items.${index}.color`)}
                      />
                      <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor={`season-${field.id}`}>
                          Season
                        </label>
                        <select
                          id={`season-${field.id}`}
                          className="h-11 min-w-0 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition-colors focus:border-[#363b6c]"
                          {...form.register(`items.${index}.season`)}
                        >
                          {seasonOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <TextField
                        label="Fabric"
                        placeholder="Cotton"
                        error={fieldErrors?.fabric?.message}
                        {...form.register(`items.${index}.fabric`)}
                      />
                      <TextField
                        label="Brand"
                        placeholder="Optional"
                        error={fieldErrors?.brand?.message}
                        {...form.register(`items.${index}.brand`)}
                      />
                      <div className="grid gap-2 md:col-span-2">
                        <label className="text-sm font-medium" htmlFor={`fit-${field.id}`}>
                          Fit
                        </label>
                        <select
                          id={`fit-${field.id}`}
                          className="h-11 min-w-0 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition-colors focus:border-[#363b6c]"
                          {...form.register(`items.${index}.fit`)}
                        >
                          {fitOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Images are validated locally, optimized in-browser, scanned server-side, then stored under your user folder.
          </p>
          <Button
            className="w-full shrink-0 sm:w-auto"
            disabled={isUploading || uploadableCount === 0}
            type="button"
            onClick={() => debouncedUploadAll()}
          >
            {isUploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            Upload {uploadableCount || selectedFiles.length} item{(uploadableCount || selectedFiles.length) === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </section>
  );
}
