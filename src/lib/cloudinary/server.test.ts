import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLOUDINARY_MAX_IMAGE_BYTES,
  deleteCloudinaryImage,
  generateOptimizedCloudinaryUrl,
  hasValidImageSignature,
  validateCloudinaryImageInput,
  withCloudinaryRetry
} from "./server.js";

const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webpBuffer = Buffer.from("RIFFxxxxWEBP", "ascii");

describe("Cloudinary server integration helpers", () => {
  it("validates supported image signatures", () => {
    assert.equal(hasValidImageSignature(jpegBuffer, "image/jpeg"), true);
    assert.equal(hasValidImageSignature(pngBuffer, "image/png"), true);
    assert.equal(hasValidImageSignature(webpBuffer, "image/webp"), true);
    assert.equal(hasValidImageSignature(Buffer.from("not an image"), "image/png"), false);
  });

  it("rejects invalid MIME types and oversized files", () => {
    assert.deepEqual(validateCloudinaryImageInput({ buffer: jpegBuffer, mimeType: "text/plain" }), {
      ok: false,
      code: "invalid_mime",
      message: "Only JPEG, PNG, and WebP images are supported."
    });

    const oversized = Buffer.alloc(CLOUDINARY_MAX_IMAGE_BYTES + 1);
    const result = validateCloudinaryImageInput({ buffer: oversized, mimeType: "image/jpeg" });

    assert.equal(result.ok, false);
    assert.equal(result.code, "file_too_large");
  });

  it("accepts a valid JPEG upload input", () => {
    assert.deepEqual(validateCloudinaryImageInput({ buffer: jpegBuffer, mimeType: "image/jpeg" }), {
      ok: true
    });
  });

  it("retries transient operations", async () => {
    let attempts = 0;
    const result = await withCloudinaryRetry(
      async () => {
        attempts += 1;

        if (attempts < 3) {
          throw new Error("temporary");
        }

        return "ok";
      },
      { attempts: 3, baseDelayMs: 1 }
    );

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
  });

  it("generates optimized delivery URLs without exposing secrets", () => {
    const fakeClient = {
      uploader: {
        upload_stream: (() => undefined) as never,
        destroy: (() => undefined) as never
      },
      url(publicId: string) {
        return `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${publicId}`;
      }
    };

    const url = generateOptimizedCloudinaryUrl("stylemate/item", { width: 640 }, fakeClient);

    assert.equal(url, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/stylemate/item");
    assert.equal(url.includes("api_secret"), false);
  });

  it("rejects unsafe delete public IDs before calling Cloudinary", async () => {
    await assert.rejects(() => deleteCloudinaryImage("../secret"), /Invalid Cloudinary public id/);
  });
});
