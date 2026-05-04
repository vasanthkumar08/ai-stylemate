import {
  allowedWardrobeMimeTypes,
  maxWardrobeUploadBytes,
  type WardrobeItemType
} from "../../features/wardrobe/schemas";

export const MAX_WARDROBE_UPLOAD_FILES = 20;
export const MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES = 12 * 1024 * 1024;

export type ClientFileValidationResult = {
  accepted: File[];
  errors: string[];
};

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Wardrobe item";
}

export function createFileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function guessWardrobeItemType(fileName: string): WardrobeItemType {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("jean")) return "jeans";
  if (normalized.includes("blazer")) return "blazer";
  if (normalized.includes("shoe") || normalized.includes("sneaker") || normalized.includes("boot")) return "shoes";
  if (normalized.includes("accessor") || normalized.includes("belt") || normalized.includes("scarf")) return "accessories";
  if (normalized.includes("tshirt") || normalized.includes("t-shirt") || normalized.includes("tee")) return "tshirt";
  if (normalized.includes("dress")) return "dress";
  if (normalized.includes("coat")) return "coat";
  if (normalized.includes("jacket")) return "jacket";

  return "shirt";
}

export function validateWardrobeFiles(
  incomingFiles: File[],
  existingFiles: File[] = []
): ClientFileValidationResult {
  const errors: string[] = [];
  const accepted: File[] = [];
  const existingFingerprints = new Set(existingFiles.map(createFileFingerprint));

  if (incomingFiles.length === 0) {
    return { accepted, errors: ["Choose at least one image to upload."] };
  }

  for (const file of incomingFiles) {
    if (existingFiles.length + accepted.length >= MAX_WARDROBE_UPLOAD_FILES) {
      errors.push(`Upload up to ${MAX_WARDROBE_UPLOAD_FILES} images at a time.`);
      break;
    }

    if (!allowedWardrobeMimeTypes.includes(file.type as (typeof allowedWardrobeMimeTypes)[number])) {
      errors.push(`${file.name}: only JPG, PNG, and WebP images are supported.`);
      continue;
    }

    if (file.size > MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES) {
      errors.push(`${file.name}: original image must be ${formatBytes(MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES)} or smaller.`);
      continue;
    }

    const fingerprint = createFileFingerprint(file);

    if (existingFingerprints.has(fingerprint) || accepted.some((item) => createFileFingerprint(item) === fingerprint)) {
      errors.push(`${file.name}: this image is already selected.`);
      continue;
    }

    accepted.push(file);
  }

  return { accepted, errors };
}

export function getFriendlyUploadError(status: number, fallback?: string) {
  if (status === 0) return "Network error. Check your connection and retry.";
  if (status === 401) return "Your session expired. Sign in again to continue.";
  if (status === 409) return "This image already exists in your wardrobe.";
  if (status === 413) return `Image must be ${formatBytes(maxWardrobeUploadBytes)} or smaller.`;
  if (status === 415) return "Only JPG, PNG, and WebP images are supported.";
  if (status === 429) return "Too many uploads. Please wait a minute and retry.";
  if (status >= 500) return "Upload service is unavailable. Retry in a moment.";

  return fallback || "Upload failed. Please try again.";
}
