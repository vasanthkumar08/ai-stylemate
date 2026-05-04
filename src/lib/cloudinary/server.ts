import { Readable } from "node:stream";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env, requireFeatureEnv } from "../../config/env";

export const CLOUDINARY_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const CLOUDINARY_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type CloudinaryAllowedImageType = (typeof CLOUDINARY_ALLOWED_IMAGE_TYPES)[number];

export type SecureCloudinaryUploadInput = {
  buffer: Buffer;
  mimeType: string;
  userId: string;
  originalFileName?: string;
};

export type SecureCloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  bytes: number;
  format: string;
  width?: number;
  height?: number;
  optimizedUrl: string;
};

type CloudinaryUploadClient = {
  uploader: {
    upload_stream: typeof cloudinary.uploader.upload_stream;
    destroy: typeof cloudinary.uploader.destroy;
  };
  url: typeof cloudinary.url;
};

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

function assertCloudinaryEnv() {
  requireFeatureEnv("cloudinary", ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);
}

export function getCloudinaryClient(): CloudinaryUploadClient {
  assertCloudinaryEnv();
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  return cloudinary;
}

export function getCloudinaryUploadFolder(userId: string) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${env.CLOUDINARY_UPLOAD_FOLDER}/wardrobe/${safeUserId}`;
}

export function hasValidImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (mimeType === "image/png") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

export function validateCloudinaryImageInput(input: { buffer: Buffer; mimeType: string }) {
  if (!CLOUDINARY_ALLOWED_IMAGE_TYPES.includes(input.mimeType as CloudinaryAllowedImageType)) {
    return {
      ok: false as const,
      code: "invalid_mime",
      message: "Only JPEG, PNG, and WebP images are supported."
    };
  }

  if (input.buffer.byteLength > CLOUDINARY_MAX_IMAGE_BYTES) {
    return {
      ok: false as const,
      code: "file_too_large",
      message: "Image must be 5 MB or smaller."
    };
  }

  if (!hasValidImageSignature(input.buffer, input.mimeType)) {
    return {
      ok: false as const,
      code: "invalid_signature",
      message: "The uploaded file is not a valid image."
    };
  }

  return { ok: true as const };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withCloudinaryRetry<T>(
  operation: () => Promise<T>,
  { attempts = 3, baseDelayMs = 300, shouldRetry = () => true }: RetryOptions = {}
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error)) {
        break;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Cloudinary operation failed.");
}

function uploadBuffer(
  client: CloudinaryUploadClient,
  input: SecureCloudinaryUploadInput
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: getCloudinaryUploadFolder(input.userId),
        resource_type: "image",
        overwrite: false,
        use_filename: false,
        unique_filename: true,
        context: input.originalFileName
          ? {
              original_file_name: input.originalFileName.slice(0, 120)
            }
          : undefined,
        transformation: [
          {
            width: 1800,
            height: 1800,
            crop: "limit",
            quality: "auto:good",
            fetch_format: "auto"
          }
        ]
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result);
      }
    );

    Readable.from(input.buffer).pipe(stream);
  });
}

export function generateOptimizedCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "limit" | "thumb";
    quality?: string;
  } = {},
  client?: CloudinaryUploadClient
) {
  const cloudinaryClient = client ?? getCloudinaryClient();

  return cloudinaryClient.url(publicId, {
    secure: true,
    transformation: [
      {
        width: options.width ?? 1200,
        height: options.height,
        crop: options.crop ?? "limit",
        quality: options.quality ?? "auto:good",
        fetch_format: "auto",
        dpr: "auto"
      }
    ]
  });
}

export async function secureUploadImageToCloudinary(
  input: SecureCloudinaryUploadInput,
  client?: CloudinaryUploadClient
): Promise<SecureCloudinaryUploadResult> {
  const cloudinaryClient = client ?? getCloudinaryClient();
  const validation = validateCloudinaryImageInput(input);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const result = await withCloudinaryRetry(() => uploadBuffer(cloudinaryClient, input), {
    attempts: 3,
    baseDelayMs: 350
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format,
    width: result.width,
    height: result.height,
    optimizedUrl: generateOptimizedCloudinaryUrl(result.public_id, {}, cloudinaryClient)
  };
}

export async function deleteCloudinaryImage(
  publicId: string,
  client?: CloudinaryUploadClient
) {
  const safePublicId = publicId.trim();

  if (!safePublicId || safePublicId.includes("..")) {
    throw new Error("Invalid Cloudinary public id.");
  }

  const cloudinaryClient = client ?? getCloudinaryClient();

  return withCloudinaryRetry(
    () =>
      new Promise<{ result?: string }>((resolve, reject) => {
        cloudinaryClient.uploader.destroy(safePublicId, { resource_type: "image" }, (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result as { result?: string });
        });
      }),
    {
      attempts: 3,
      baseDelayMs: 250
    }
  );
}
