import { NextResponse } from "next/server";
import { withAdminApi } from "@/lib/admin/api";
import { jsonError } from "@/lib/security/http";

export const runtime = "nodejs";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxScanBytes = 8 * 1024 * 1024;

function detectType(fileName: string) {
  const name = fileName.toLowerCase();

  if (name.includes("jean")) return { clothingType: "Jeans", category: "Bottom", fabric: "Denim" };
  if (name.includes("shoe") || name.includes("sneaker") || name.includes("boot")) {
    return { clothingType: "Shoes", category: "Shoes", fabric: "Leather blend" };
  }
  if (name.includes("dress")) return { clothingType: "Dress", category: "Dress", fabric: "Crepe blend" };
  if (name.includes("coat") || name.includes("jacket") || name.includes("blazer")) {
    return { clothingType: "Outerwear", category: "Outerwear", fabric: "Wool blend" };
  }
  if (name.includes("tee") || name.includes("shirt")) return { clothingType: "Shirt", category: "Top", fabric: "Cotton" };

  return { clothingType: "Wardrobe item", category: "Top", fabric: "Cotton blend" };
}

function detectColor(fileName: string) {
  const colors = ["black", "white", "blue", "navy", "red", "green", "pink", "beige", "brown", "gray"];
  const name = fileName.toLowerCase();

  return colors.find((color) => name.includes(color)) ?? "Neutral";
}

export const POST = withAdminApi(async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return jsonError("Upload an image to scan.", 400);
  }

  if (!allowedTypes.includes(file.type)) {
    return jsonError("Only JPEG, PNG, and WebP images are supported.", 415);
  }

  if (file.size > maxScanBytes) {
    return jsonError("Scan image must be 8 MB or smaller.", 413);
  }

  const detected = detectType(file.name);

  return NextResponse.json({
    metadata: {
      clothingType: detected.clothingType,
      color: detectColor(file.name),
      category: detected.category,
      fabricEstimate: detected.fabric,
      confidence: 0.87
    }
  });
});
