import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFriendlyUploadError,
  guessWardrobeItemType,
  MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES,
  validateWardrobeFiles
} from "./wardrobe-upload-utils";

function createFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, {
    type,
    lastModified: 1_777_777_777
  });
}

describe("wardrobe upload validation", () => {
  it("rejects empty submissions", () => {
    const result = validateWardrobeFiles([]);

    assert.equal(result.accepted.length, 0);
    assert.equal(result.errors[0], "Choose at least one image to upload.");
  });

  it("rejects unsupported MIME types", () => {
    const result = validateWardrobeFiles([createFile("invoice.pdf", "application/pdf")]);

    assert.equal(result.accepted.length, 0);
    assert.match(result.errors[0] ?? "", /only JPG, PNG, and WebP/);
  });

  it("rejects originals larger than 12 MB", () => {
    const result = validateWardrobeFiles([
      createFile("large-shirt.jpg", "image/jpeg", MAX_ORIGINAL_WARDROBE_UPLOAD_BYTES + 1)
    ]);

    assert.equal(result.accepted.length, 0);
    assert.match(result.errors[0] ?? "", /12\.0 MB or smaller/);
  });

  it("rejects duplicate selected files", () => {
    const file = createFile("white-shirt.webp", "image/webp");
    const result = validateWardrobeFiles([file], [file]);

    assert.equal(result.accepted.length, 0);
    assert.match(result.errors[0] ?? "", /already selected/);
  });

  it("maps file names to friendly wardrobe item types", () => {
    assert.equal(guessWardrobeItemType("blue-jeans.png"), "jeans");
    assert.equal(guessWardrobeItemType("linen-blazer.webp"), "blazer");
    assert.equal(guessWardrobeItemType("white-tee.jpeg"), "tshirt");
  });

  it("returns user-friendly upload errors", () => {
    assert.equal(getFriendlyUploadError(409), "This image already exists in your wardrobe.");
    assert.equal(getFriendlyUploadError(0), "Network error. Check your connection and retry.");
    assert.equal(getFriendlyUploadError(502), "Upload service is unavailable. Retry in a moment.");
  });
});
