"use server";

import { wardrobeUploadSchema } from "@/features/wardrobe/schemas";

export type WardrobeActionState = {
  ok: boolean;
  message: string;
};

export async function createWardrobeItemAction(
  _previousState: WardrobeActionState,
  formData: FormData
): Promise<WardrobeActionState> {
  const result = wardrobeUploadSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    color: formData.get("color") || undefined,
    season: formData.get("season") || undefined
  });

  if (!result.success) {
    return {
      ok: false,
      message: result.error.issues.at(0)?.message ?? "Please check the wardrobe item details."
    };
  }

  return {
    ok: true,
    message: "Wardrobe item validation passed. Supabase persistence is ready for credentials."
  };
}
