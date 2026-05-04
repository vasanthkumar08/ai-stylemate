"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  allowedWardrobeMimeTypes,
  maxWardrobeUploadBytes,
  wardrobeUploadSchema,
  type WardrobeUploadInput
} from "@/features/wardrobe/schemas";
import { cn } from "@/lib/utils";

type UploadStatus = "queued" | "compressing" | "ready" | "uploading" | "uploaded" | "error";

type UploadFile = {
  id: string;
  file: File;
  uploadFile?: File | undefined;
  previewUrl: string;
  metadata: WardrobeUploadInput;
  progress: number;
  status: UploadStatus;
  error?: string | undefined;
  uploadedUrl?: string | undefined;
};

const categoryOptions = [
  ["top", "Top"],
  ["bottom", "Bottom"],
  ["dress", "Dress"],
  ["outerwear", "Outerwear"],
  ["shoes", "Shoes"],
  ["accessory", "Accessory"],
  ["bag", "Bag"],
  ["jewelry", "Jewelry"],
  ["activewear", "Activewear"],
  ["other", "Other"]
] as const;

const seasonOptions = [
  ["all-season", "All-season"],
  ["spring", "Spring"],
  ["summer", "Summer"],
  ["fall", "Fall"],
  ["winter", "Winter"]
] as const;

const fitOptions = [
  ["", "Select fit"],
  ["slim", "Slim"],
  ["regular", "Regular"],
  ["relaxed", "Relaxed"],
  ["oversized", "Oversized"],
  ["tailored", "Tailored"],
  ["stretch", "Stretch"]
] as const;

const fileAccept = allowedWardrobeMimeTypes.join(",");
const maxOriginalBytes = 12 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Wardrobe item";
}

function createDefaultMetadata(file: File): WardrobeUploadInput {
  return {
    name: getFileBaseName(file.name),
    category: "top",
    season: "all-season",
    fit: undefined
  };
}

function validateClientFile(file: File) {
  if (!allowedWardrobeMimeTypes.includes(file.type as (typeof allowedWardrobeMimeTypes)[number])) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }

  if (file.size > maxOriginalBytes) {
    return `Original image must be ${formatBytes(maxOriginalBytes)} or smaller.`;
  }

  return null;
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
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82);
  });

  if (!blob || blob.size > file.size || blob.size > maxWardrobeUploadBytes) {
    return file;
  }

  return new File([blob], `${getFileBaseName(file.name)}.webp`, {
    type: "image/webp",
    lastModified: Date.now()
  });
}

function uploadWithProgress(formData: FormData, onProgress: (progress: number) => void) {
  return new Promise<{ item: { image_url?: string } }>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      const response = JSON.parse(request.responseText || "{}") as {
        item?: { image_url?: string };
        error?: string;
      };

      if (request.status >= 200 && request.status < 300 && response.item) {
        resolve({ item: response.item });
        return;
      }

      reject(new Error(response.error ?? "Upload failed."));
    };

    request.onerror = () => reject(new Error("Network error while uploading."));
    request.open("POST", "/api/wardrobe/upload");
    request.setRequestHeader("X-StyleMate-Client", "web");
    request.send(formData);
  });
}

export function WardrobeUploadForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const uploadableFiles = useMemo(
    () => files.filter((file) => file.status === "ready" || file.status === "error"),
    [files]
  );

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [files]);

  async function addFiles(fileList: FileList | File[]) {
    const incomingFiles = Array.from(fileList);
    setFormError(null);

    const preparedFiles: UploadFile[] = incomingFiles.map((file) => {
      const error = validateClientFile(file);

      return {
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        metadata: createDefaultMetadata(file),
        progress: 0,
        status: error ? "error" : "compressing",
        error: error ?? undefined
      };
    });

    setFiles((current) => [...current, ...preparedFiles]);

    await Promise.all(
      preparedFiles
        .filter((item) => !item.error)
        .map(async (item) => {
          try {
            const uploadFile = await compressImage(item.file);
            const sizeError =
              uploadFile.size > maxWardrobeUploadBytes
                ? `Compressed image must be ${formatBytes(maxWardrobeUploadBytes)} or smaller.`
                : null;

            setFiles((current) =>
              current.map((currentItem) =>
                currentItem.id === item.id
                  ? {
                      ...currentItem,
                      uploadFile,
                      status: sizeError ? "error" : "ready",
                      error: sizeError ?? undefined
                    }
                  : currentItem
              )
            );
          } catch (error) {
            setFiles((current) =>
              current.map((currentItem) =>
                currentItem.id === item.id
                  ? {
                      ...currentItem,
                      status: "error",
                      error: error instanceof Error ? error.message : "Compression failed."
                    }
                  : currentItem
              )
            );
          }
        })
    );
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const item = current.find((file) => file.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((file) => file.id !== id);
    });
  }

  function updateMetadata<Key extends keyof WardrobeUploadInput>(
    id: string,
    key: Key,
    value: WardrobeUploadInput[Key]
  ) {
    setFiles((current) =>
      current.map((file) =>
        file.id === id
          ? {
              ...file,
              metadata: { ...file.metadata, [key]: value || undefined }
            }
          : file
      )
    );
  }

  async function uploadOne(item: UploadFile) {
    const uploadFile = item.uploadFile ?? item.file;
    const itemName = item.metadata.name?.trim() || getFileBaseName(item.file.name);
    const parsed = wardrobeUploadSchema.safeParse({
      ...item.metadata,
      name: itemName
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues.at(0)?.message ?? "Check wardrobe metadata.");
      return;
    }

    const formData = new FormData();
    formData.set("file", uploadFile);
    formData.set("name", itemName);
    formData.set("category", parsed.data.category);
    formData.set("season", parsed.data.season ?? "all-season");

    for (const field of ["color", "fabric", "brand", "fit"] as const) {
      const value = parsed.data[field];

      if (value) {
        formData.set(field, value);
      }
    }

    setFiles((current) =>
      current.map((file) =>
        file.id === item.id ? { ...file, status: "uploading", progress: 0, error: undefined } : file
      )
    );

    try {
      const result = await uploadWithProgress(formData, (progress) => {
        setFiles((current) =>
          current.map((file) => (file.id === item.id ? { ...file, progress } : file))
        );
      });

      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? {
                ...file,
                status: "uploaded",
                progress: 100,
                uploadedUrl: result.item.image_url
              }
            : file
        )
      );
    } catch (error) {
      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? {
                ...file,
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Upload failed."
              }
            : file
        )
      );
    }
  }

  async function uploadAll() {
    setFormError(null);

    if (!files.length) {
      setFormError("Add at least one wardrobe image.");
      return;
    }

    for (const item of files) {
      if (item.status === "ready" || item.status === "error") {
        await uploadOne(item);
      }
    }
  }

  return (
    <section className="premium-card rounded-2xl p-5">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">Cloudinary upload</p>
        <h2 className="mt-1 text-lg font-semibold">Add wardrobe items</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Drop multiple images, preview them, compress locally, and upload with retry support.
        </p>
      </div>

      <div
        className={cn(
          "mt-5 grid min-h-40 cursor-pointer place-items-center rounded-lg border border-dashed p-5 text-center transition",
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
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          accept={fileAccept}
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
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-medium">Drag images here or browse</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            JPEG, PNG, or WebP. Up to {formatBytes(maxOriginalBytes)} before compression.
          </p>
        </div>
      </div>

      {files.length ? (
        <div className="mt-5 grid gap-3">
          {files.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-3">
              <div className="flex gap-3">
                <div
                  className="size-20 rounded-lg border border-[var(--border)] bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.previewUrl})` }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.file.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatBytes(item.file.size)}
                        {item.uploadFile ? ` -> ${formatBytes(item.uploadFile.size)}` : ""}
                      </p>
                    </div>
                    <button
                      className="rounded-md p-2 text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-red-600"
                      type="button"
                      onClick={() => removeFile(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.status === "error" ? "bg-red-500" : "bg-[var(--accent)]"
                      )}
                      style={{ width: `${item.status === "compressing" ? 35 : item.progress}%` }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      {item.status === "compressing" || item.status === "uploading" ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                      ) : item.status === "uploaded" ? (
                        <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                      ) : item.status === "error" ? (
                        <AlertCircle className="size-3 text-red-600" aria-hidden="true" />
                      ) : null}
                      {item.error ?? item.status}
                    </p>
                    {item.status === "error" && item.uploadFile ? (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
                        type="button"
                        onClick={() => void uploadOne(item)}
                      >
                        <RefreshCw className="size-3" aria-hidden="true" />
                        Retry
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Item name"
                      placeholder="White oxford shirt"
                      value={item.metadata.name ?? ""}
                      onChange={(event) => updateMetadata(item.id, "name", event.target.value)}
                    />
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor={`category-${item.id}`}>
                        Category
                      </label>
                      <select
                        id={`category-${item.id}`}
                        className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827]"
                        value={item.metadata.category}
                        onChange={(event) =>
                          updateMetadata(
                            item.id,
                            "category",
                            event.target.value as WardrobeUploadInput["category"]
                          )
                        }
                      >
                        {categoryOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <TextField
                      label="Color"
                      placeholder="Ivory"
                      value={item.metadata.color ?? ""}
                      onChange={(event) => updateMetadata(item.id, "color", event.target.value)}
                    />
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor={`season-${item.id}`}>
                        Season
                      </label>
                      <select
                        id={`season-${item.id}`}
                        className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827]"
                        value={item.metadata.season}
                        onChange={(event) =>
                          updateMetadata(
                            item.id,
                            "season",
                            event.target.value as WardrobeUploadInput["season"]
                          )
                        }
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
                      value={item.metadata.fabric ?? ""}
                      onChange={(event) => updateMetadata(item.id, "fabric", event.target.value)}
                    />
                    <TextField
                      label="Brand"
                      placeholder="COS"
                      value={item.metadata.brand ?? ""}
                      onChange={(event) => updateMetadata(item.id, "brand", event.target.value)}
                    />
                    <div className="grid gap-2 sm:col-span-2">
                      <label className="text-sm font-medium" htmlFor={`fit-${item.id}`}>
                        Fit
                      </label>
                      <select
                        id={`fit-${item.id}`}
                        className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827]"
                        value={item.metadata.fit ?? ""}
                        onChange={(event) =>
                          updateMetadata(item.id, "fit", event.target.value as WardrobeUploadInput["fit"])
                        }
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
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {formError ? <p className="mt-4 text-sm text-red-600">{formError}</p> : null}

      <Button
        className="mt-5 w-full"
        disabled={!files.length || uploadableFiles.length === 0}
        type="button"
        onClick={() => void uploadAll()}
      >
        <Upload className="size-4" aria-hidden="true" />
        Upload {uploadableFiles.length || files.length} item{(uploadableFiles.length || files.length) === 1 ? "" : "s"}
      </Button>
    </section>
  );
}
